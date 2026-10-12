const express = require('express');
const db = require('../config/db');
const { auth, adminOnly, scopeUnit } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const router = express.Router();
router.use(auth());
router.use(scopeUnit);

// Penyusutan garis lurus (PSAK 16 sederhana): mulai Januari tahun berikut perolehan,
// akumulasi = dasar susut / umur manfaat * bulan berjalan, dibatasi umur manfaat & residu
function calcDepreciation(asset, pol, refDate) {
  const harga = Number(asset.purchase_price || 0);
  const umur = Number(pol?.useful_life_years || 5);
  const residual = Number(pol?.residual_percent || 0) / 100;
  if (pol?.method === 'tanpa_susut' || umur <= 0 || harga <= 0) {
    return { akumulasi: 0, nilai_buku: harga, penyusutan_tahun: 0 };
  }
  const tahunBeli = Number(asset.purchase_year) || refDate.getFullYear();
  const start = new Date(tahunBeli + 1, 0, 1);
  let ref = refDate > start ? new Date(refDate) : start;
  let bulan = (ref.getFullYear() - start.getFullYear()) * 12 + (ref.getMonth() - start.getMonth()) + 1;
  const maxBulan = umur * 12;
  if (bulan < 0) bulan = 0;
  if (bulan > maxBulan) bulan = maxBulan;
  const dasar = harga * (1 - residual);
  const akumulasi = Math.min(dasar, dasar / maxBulan * bulan);
  const penyusutanTahun = dasar / umur;
  const round = v => Math.round(v * 100) / 100;
  return { akumulasi: round(akumulasi), nilai_buku: round(harga - akumulasi), penyusutan_tahun: round(penyusutanTahun) };
}

// Kebijakan per kategori (termasuk kategori yang belum punya kebijakan -> default)
router.get('/policies', async (req, res) => {
  try {
    let sql = `SELECT p.*, c.name as category_name, c.code as category_code
      FROM depreciation_policies p JOIN categories c ON c.id=p.category_id WHERE 1=1`;
    const params = [];
    if (req.scopedUnitId) { sql += ' AND (c.unit_id IS NULL OR c.unit_id=?)'; params.push(req.scopedUnitId); }
    const [rows] = await db.query(sql, params);
    const [cats] = await db.query(
      req.scopedUnitId
        ? 'SELECT id, name, code FROM categories WHERE unit_id IS NULL OR unit_id=?'
        : 'SELECT id, name, code FROM categories',
      req.scopedUnitId ? [req.scopedUnitId] : []
    );
    const map = new Map(rows.map(r => [r.category_id, r]));
    const merged = cats.map(c => map.get(c.id) || {
      category_id: c.id, category_name: c.name, category_code: c.code,
      method: 'garis_lurus', useful_life_years: 5, residual_percent: 0
    });
    res.json(merged);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Simpan kebijakan (admin)
router.put('/policies/:categoryId', adminOnly, async (req, res) => {
  const { method, useful_life_years, residual_percent } = req.body || {};
  if (!['garis_lurus', 'tanpa_susut'].includes(method)) return res.status(400).json({ message: 'Metode tidak valid' });
  const umur = parseInt(useful_life_years, 10);
  if (!Number.isFinite(umur) || umur < 1 || umur > 100) return res.status(400).json({ message: 'Umur manfaat 1-100 tahun' });
  const resi = Number(residual_percent);
  if (!Number.isFinite(resi) || resi < 0 || resi > 100) return res.status(400).json({ message: 'Residu 0-100%' });
  try {
    await db.query(
      `INSERT INTO depreciation_policies (category_id, method, useful_life_years, residual_percent, updated_by)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE method=VALUES(method), useful_life_years=VALUES(useful_life_years),
         residual_percent=VALUES(residual_percent), updated_by=VALUES(updated_by)`,
      [req.params.categoryId, method, umur, resi, req.user.id]
    );
    await logAudit(req, 'update', 'depreciation_policy', req.params.categoryId, { method, useful_life_years: umur, residual_percent: resi });
    res.json({ message: 'Kebijakan penyusutan disimpan' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Laporan nilai aset (harga perolehan, akumulasi penyusutan, nilai buku)
router.get('/valuation', async (req, res) => {
  try {
    const { unit_id, category_id, as_of } = req.query;
    const refDate = as_of ? new Date(as_of + 'T23:59:59') : new Date();
    let sql = `SELECT a.*, u.code as unit_code, u.name as unit_name, c.name as category_name,
        COALESCE(p.method,'garis_lurus') as dep_method,
        COALESCE(p.useful_life_years,5) as useful_life_years,
        COALESCE(p.residual_percent,0) as residual_percent
      FROM assets a
      JOIN units u ON u.id=a.unit_id
      JOIN categories c ON c.id=a.category_id
      LEFT JOIN depreciation_policies p ON p.category_id=a.category_id
      WHERE a.status != 'dihapus'`;
    const p = [];
    if (req.scopedUnitId) { sql += ' AND a.unit_id=?'; p.push(req.scopedUnitId); }
    else if (unit_id) { sql += ' AND a.unit_id=?'; p.push(unit_id); }
    if (category_id) { sql += ' AND a.category_id=?'; p.push(category_id); }
    sql += ' ORDER BY u.code, c.name, a.asset_code';
    const [rows] = await db.query(sql, p);
    const out = rows.map(r => {
      const d = calcDepreciation(r, r, refDate);
      return {
        id: r.id, asset_code: r.asset_code, name: r.name, unit_code: r.unit_code, unit_name: r.unit_name,
        category_name: r.category_name, purchase_year: r.purchase_year, purchase_price: Number(r.purchase_price),
        method: r.dep_method, useful_life_years: r.useful_life_years, residual_percent: Number(r.residual_percent),
        akumulasi_penyusutan: d.akumulasi, nilai_buku: d.nilai_buku, penyusutan_per_tahun: d.penyusutan_tahun
      };
    });
    const total = out.reduce((s, r) => ({
      harga: s.harga + r.purchase_price,
      akumulasi: s.akumulasi + r.akumulasi_penyusutan,
      buku: s.buku + r.nilai_buku
    }), { harga: 0, akumulasi: 0, buku: 0 });
    total.harga = Math.round(total.harga * 100) / 100;
    total.akumulasi = Math.round(total.akumulasi * 100) / 100;
    total.buku = Math.round(total.buku * 100) / 100;
    res.json({ as_of: refDate.toISOString().slice(0, 10), rows: out, total });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// CSV laporan nilai aset
router.get('/valuation.csv', async (req, res) => {
  try {
    const { unit_id, category_id, as_of } = req.query;
    const refDate = as_of ? new Date(as_of + 'T23:59:59') : new Date();
    let sql = `SELECT a.*, u.code as unit_code, c.name as category_name,
        COALESCE(p.method,'garis_lurus') as dep_method,
        COALESCE(p.useful_life_years,5) as useful_life_years,
        COALESCE(p.residual_percent,0) as residual_percent
      FROM assets a
      JOIN units u ON u.id=a.unit_id
      JOIN categories c ON c.id=a.category_id
      LEFT JOIN depreciation_policies p ON p.category_id=a.category_id
      WHERE a.status != 'dihapus'`;
    const p = [];
    if (req.scopedUnitId) { sql += ' AND a.unit_id=?'; p.push(req.scopedUnitId); }
    else if (unit_id) { sql += ' AND a.unit_id=?'; p.push(unit_id); }
    if (category_id) { sql += ' AND a.category_id=?'; p.push(category_id); }
    sql += ' ORDER BY u.code, c.name, a.asset_code';
    const [rows] = await db.query(sql, p);
    const fmt = v => Number(v).toLocaleString('id-ID');
    const header = 'kode;nama;unit;kategori;tahun;harga_perolehan;metode;umur_thn;residu_%;akumulasi_penyusutan;nilai_buku\n';
    const body = rows.map(r => {
      const d = calcDepreciation(r, r, refDate);
      return [r.asset_code, r.name, r.unit_code, r.category_name, r.purchase_year || '', fmt(r.purchase_price),
        r.dep_method, r.useful_life_years, r.residual_percent, fmt(d.akumulasi), fmt(d.nilai_buku)].join(';');
    }).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment(`nilai-aset-${refDate.toISOString().slice(0, 10)}.csv`);
    res.send(header + body);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
