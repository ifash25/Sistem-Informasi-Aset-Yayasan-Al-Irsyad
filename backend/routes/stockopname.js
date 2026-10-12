const express = require('express');
const db = require('../config/db');
const { auth, operatorOrAdmin, scopeUnit } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const { notifyAdmins } = require('../helpers/notify');
const router = express.Router();
router.use(auth());
router.use(scopeUnit);

function scopedUnitId(req) {
  return req.scopedUnitId || null; // null = admin
}

// Daftar opname
router.get('/', async (req, res) => {
  try {
    const su = scopedUnitId(req);
    let sql = `SELECT s.*, u.code as unit_code, u.name as unit_name,
        cu.name as created_name, fu.name as finished_name
      FROM stock_opnames s
      JOIN units u ON u.id=s.unit_id
      LEFT JOIN users cu ON cu.id=s.created_by
      LEFT JOIN users fu ON fu.id=s.finished_by
      WHERE 1=1`;
    const p = [];
    if (su) { sql += ' AND s.unit_id=?'; p.push(su); }
    sql += ' ORDER BY s.created_at DESC';
    const [rows] = await db.query(sql, p);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Detail opname + items
router.get('/:id', async (req, res) => {
  try {
    const su = scopedUnitId(req);
    const [[s]] = await db.query(
      `SELECT s.*, u.code as unit_code, u.name as unit_name,
          cu.name as created_name, fu.name as finished_name
        FROM stock_opnames s
        JOIN units u ON u.id=s.unit_id
        LEFT JOIN users cu ON cu.id=s.created_by
        LEFT JOIN users fu ON fu.id=s.finished_by
        WHERE s.id=?`,
      [req.params.id]
    );
    if (!s) return res.status(404).json({ message: 'Opname tidak ditemukan' });
    if (su && String(s.unit_id) !== String(su)) return res.status(403).json({ message: 'Bukan opname unit Anda' });
    const [items] = await db.query(
      `SELECT oi.*, a.name as live_name, a.\`condition\` as live_condition, a.status as live_status
       FROM stock_opname_items oi
       LEFT JOIN assets a ON a.id=oi.asset_id
       WHERE oi.opname_id=? ORDER BY oi.id`,
      [s.id]
    );
    res.json({ ...s, items });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Buat opname
router.post('/', operatorOrAdmin, async (req, res) => {
  let { unit_id, title, opname_date, notes } = req.body || {};
  const su = scopedUnitId(req);
  if (su) unit_id = su;
  if (!unit_id || !title || !opname_date) return res.status(400).json({ message: 'Unit, judul, dan tanggal wajib diisi' });
  try {
    const [[dup]] = await db.query(
      "SELECT COUNT(*) as c FROM stock_opnames WHERE unit_id=? AND status='draft'", [unit_id]
    );
    if (dup.c > 0) return res.status(400).json({ message: 'Masih ada opname draft untuk unit ini, selesaikan dulu' });
    const [r] = await db.query(
      'INSERT INTO stock_opnames (unit_id,title,opname_date,notes,created_by) VALUES (?,?,?,?,?)',
      [unit_id, title, opname_date, notes || null, req.user.id]
    );
    await logAudit(req, 'create', 'stock_opname', r.insertId, { unit_id, title, opname_date });
    res.json({ id: r.insertId, message: 'Opname dibuat' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Tambah item: pindai/isi kode aset + hasil hitung
router.post('/:id/items', operatorOrAdmin, async (req, res) => {
  const { asset_code, result, notes } = req.body || {};
  const finding = ['ada', 'hilang', 'rusak_ringan', 'rusak_berat'];
  try {
    const [[s]] = await db.query('SELECT * FROM stock_opnames WHERE id=?', [req.params.id]);
    if (!s) return res.status(404).json({ message: 'Opname tidak ditemukan' });
    const su = scopedUnitId(req);
    if (su && String(s.unit_id) !== String(su)) return res.status(403).json({ message: 'Bukan opname unit Anda' });
    if (s.status !== 'draft') return res.status(400).json({ message: 'Opname sudah selesai' });
    if (!asset_code) return res.status(400).json({ message: 'Kode aset wajib diisi' });
    if (!finding.includes(result)) return res.status(400).json({ message: 'Hasil hitung tidak valid' });

    // aset harus milik unit opname
    const [[a]] = await db.query(
      'SELECT id, asset_code, name FROM assets WHERE asset_code=? AND unit_id=?',
      [asset_code, s.unit_id]
    );
    if (!a) return res.status(400).json({ message: `Aset ${asset_code} tidak ditemukan di unit ini` });
    const [dup] = await db.query('SELECT id FROM stock_opname_items WHERE opname_id=? AND asset_id=?', [s.id, a.id]);
    if (dup.length) return res.status(400).json({ message: 'Aset sudah dihitung pada opname ini' });

    const [r] = await db.query(
      'INSERT INTO stock_opname_items (opname_id,asset_id,asset_code,asset_name,result,notes,counted_by) VALUES (?,?,?,?,?,?,?)',
      [s.id, a.id, a.asset_code, a.name, result, notes || null, req.user.id]
    );
    // Sinkronkan kondisi aset fisik: kalau dilaporkan rusak/hilang, ikutkan kondisinya
    if (result !== 'ada') {
      await db.query('UPDATE assets SET `condition`=? WHERE id=?', [result, a.id]);
    }
    await logAudit(req, 'count', 'stock_opname_item', r.insertId, { opname_id: s.id, asset_code: a.asset_code, result });
    res.json({ id: r.insertId, message: 'Tercatat' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Hapus item (opname masih draft)
router.delete('/:id/items/:itemId', operatorOrAdmin, async (req, res) => {
  try {
    const [[s]] = await db.query('SELECT * FROM stock_opnames WHERE id=?', [req.params.id]);
    if (!s) return res.status(404).json({ message: 'Opname tidak ditemukan' });
    const su = scopedUnitId(req);
    if (su && String(s.unit_id) !== String(su)) return res.status(403).json({ message: 'Bukan opname unit Anda' });
    if (s.status !== 'draft') return res.status(400).json({ message: 'Opname sudah selesai' });
    await db.query('DELETE FROM stock_opname_items WHERE id=? AND opname_id=?', [req.params.itemId, s.id]);
    res.json({ message: 'Item dihapus' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Selesaikan opname: snapshot jumlah aset unit + hitung selisih
router.post('/:id/finish', operatorOrAdmin, async (req, res) => {
  try {
    const [[s]] = await db.query('SELECT * FROM stock_opnames WHERE id=?', [req.params.id]);
    if (!s) return res.status(404).json({ message: 'Opname tidak ditemukan' });
    const su = scopedUnitId(req);
    if (su && String(s.unit_id) !== String(su)) return res.status(403).json({ message: 'Bukan opname unit Anda' });
    if (s.status !== 'draft') return res.status(400).json({ message: 'Sudah pernah diselesaikan' });
    const [[cnt]] = await db.query('SELECT COUNT(*) as c FROM stock_opname_items WHERE opname_id=?', [s.id]);
    if (cnt.c === 0) return res.status(400).json({ message: 'Belum ada aset yang dihitung' });
    const [[total]] = await db.query("SELECT COUNT(*) as c FROM assets WHERE unit_id=? AND status != 'dihapus'", [s.unit_id]);
    const [[missing]] = await db.query("SELECT COUNT(*) as c FROM stock_opname_items WHERE opname_id=? AND result='hilang'", [s.id]);
    await db.query(
      `UPDATE stock_opnames SET status='selesai', total_assets=?, total_counted=?, total_missing=?,
        finished_by=?, finished_at=NOW() WHERE id=?`,
      [total.c, cnt.c, missing.c, req.user.id, s.id]
    );
    await logAudit(req, 'finish', 'stock_opname', s.id, { total_assets: total.c, counted: cnt.c, missing: missing.c });
    const [[u]] = await db.query('SELECT code FROM units WHERE id=?', [s.unit_id]);
    await notifyAdmins(req.user.id, {
      title: 'Stock opname selesai',
      message: `${s.title} — unit ${u?.code || s.unit_id}: ${cnt.c}/${total.c} aset dihitung, ${missing.c} hilang`,
      type: 'opname', link: '/opname'
    });
    res.json({ message: 'Opname diselesaikan' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// CSV hasil opname
router.get('/:id/csv', async (req, res) => {
  try {
    const su = scopedUnitId(req);
    const [[s]] = await db.query('SELECT * FROM stock_opnames WHERE id=?', [req.params.id]);
    if (!s) return res.status(404).json({ message: 'Tidak ditemukan' });
    if (su && String(s.unit_id) !== String(su)) return res.status(403).json({ message: 'Bukan opname unit Anda' });
    const [items] = await db.query(
      'SELECT asset_code, asset_name, result, notes FROM stock_opname_items WHERE opname_id=? ORDER BY id',
      [s.id]
    );
    const header = 'kode;nama;hasil;catatan\n';
    const body = items.map(i => [i.asset_code, i.asset_name, i.result, i.notes || ''].join(';')).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment(`opname-${s.id}.csv`);
    res.send(header + body);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
