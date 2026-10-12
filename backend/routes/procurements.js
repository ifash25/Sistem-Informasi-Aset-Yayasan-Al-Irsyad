const express = require('express');
const db = require('../config/db');
const { auth, adminOnly, operatorOrAdmin, scopeUnit } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const router = express.Router();
router.use(auth());
router.use(scopeUnit);

function scopedUnitId(req) {
  return req.scopedUnitId || null;
}

async function recalc(id) {
  const [[p]] = await db.query(
    'SELECT COALESCE(SUM(qty*unit_price),0) as tp FROM procurement_items WHERE procurement_id=?', [id]
  );
  const [[r]] = await db.query(
    'SELECT COALESCE(SUM(COALESCE(real_qty,qty)*COALESCE(real_price,unit_price)),0) as tr FROM procurement_items WHERE procurement_id=? AND received=1', [id]
  );
  await db.query('UPDATE procurements SET total_plan=?, total_real=? WHERE id=?', [p.tp, r.tr, id]);
}

// List rencana (operator: unitnya)
router.get('/', async (req, res) => {
  try {
    const su = scopedUnitId(req);
    let sql = `SELECT p.*, u.code as unit_code, u.name as unit_name,
        (SELECT COUNT(*) FROM procurement_items i WHERE i.procurement_id=p.id) as item_count,
        (SELECT COUNT(*) FROM procurement_items i WHERE i.procurement_id=p.id AND i.received=1) as received_count
      FROM procurements p JOIN units u ON u.id=p.unit_id WHERE 1=1`;
    const params = [];
    if (su) { sql += ' AND p.unit_id=?'; params.push(su); }
    sql += ' ORDER BY p.created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Buat rencana
router.post('/', operatorOrAdmin, async (req, res) => {
  let { unit_id, title, plan_year } = req.body;
  const su = scopedUnitId(req);
  if (su) unit_id = su;
  if (!unit_id || !title || !plan_year) return res.status(400).json({ message: 'Unit, judul, tahun wajib diisi' });
  try {
    const [r] = await db.query(
      'INSERT INTO procurements (unit_id, title, plan_year, status, created_by) VALUES (?,?,?,?,?)',
      [unit_id, title, plan_year, 'draft', req.user.id]
    );
    res.json({ id: r.insertId, message: 'Rencana dibuat' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Detail + items
router.get('/:id', async (req, res) => {
  try {
    const su = scopedUnitId(req);
    const [[p]] = await db.query(
      'SELECT p.*, u.code as unit_code, u.name as unit_name FROM procurements p JOIN units u ON u.id=p.unit_id WHERE p.id=?',
      [req.params.id]
    );
    if (!p) return res.status(404).json({ message: 'Tidak ditemukan' });
    if (su && String(p.unit_id) !== String(su)) return res.status(403).json({ message: 'Bukan rencana unit Anda' });
    const [items] = await db.query(
      `SELECT i.*, c.name as category_name, a.asset_code FROM procurement_items i
       LEFT JOIN categories c ON c.id=i.category_id
       LEFT JOIN assets a ON a.id=i.asset_id
       WHERE i.procurement_id=? ORDER BY i.id`,
      [p.id]
    );
    res.json({ ...p, items });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Tambah item
router.post('/:id/items', operatorOrAdmin, async (req, res) => {
  const { name, category_id, qty, unit_price, vendor, notes } = req.body;
  if (!name || !qty) return res.status(400).json({ message: 'Nama dan qty wajib diisi' });
  try {
    const [[p]] = await db.query('SELECT unit_id, status FROM procurements WHERE id=?', [req.params.id]);
    if (!p) return res.status(404).json({ message: 'Rencana tidak ditemukan' });
    const su = scopedUnitId(req);
    if (su && String(p.unit_id) !== String(su)) return res.status(403).json({ message: 'Bukan rencana unit Anda' });
    if (!['draft', 'diajukan'].includes(p.status)) return res.status(400).json({ message: 'Rencana sudah dikunci' });
    await db.query(
      'INSERT INTO procurement_items (procurement_id, name, category_id, qty, unit_price, vendor, notes) VALUES (?,?,?,?,?,?,?)',
      [req.params.id, name, category_id || null, qty, unit_price || 0, vendor || null, notes || null]
    );
    await recalc(req.params.id);
    res.json({ message: 'Item ditambah' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Hapus item
router.delete('/items/:itemId', operatorOrAdmin, async (req, res) => {
  try {
    const [[i]] = await db.query(
      'SELECT i.*, p.unit_id, p.status FROM procurement_items i JOIN procurements p ON p.id=i.procurement_id WHERE i.id=?',
      [req.params.itemId]
    );
    if (!i) return res.status(404).json({ message: 'Tidak ditemukan' });
    const su = scopedUnitId(req);
    if (su && String(i.unit_id) !== String(su)) return res.status(403).json({ message: 'Bukan rencana unit Anda' });
    if (i.received) return res.status(400).json({ message: 'Item sudah diterima, tidak bisa dihapus' });
    await db.query('DELETE FROM procurement_items WHERE id=?', [i.id]);
    await recalc(i.procurement_id);
    res.json({ message: 'Item dihapus' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Ajukan (draft -> diajukan)
router.put('/:id/submit', operatorOrAdmin, async (req, res) => {
  try {
    const su = scopedUnitId(req);
    const where = su ? 'id=? AND unit_id=?' : 'id=?';
    const params = su ? [req.params.id, su] : [req.params.id];
    const [[p]] = await db.query(`SELECT * FROM procurements WHERE ${where}`, params);
    if (!p) return res.status(404).json({ message: 'Tidak ditemukan' });
    if (p.status !== 'draft') return res.status(400).json({ message: 'Hanya draft yang bisa diajukan' });
    const [cnt] = await db.query('SELECT COUNT(*) c FROM procurement_items WHERE procurement_id=?', [p.id]);
    if (!cnt[0].c) return res.status(400).json({ message: 'Belum ada item' });
    await db.query(`UPDATE procurements SET status='diajukan' WHERE id=?`, [p.id]);
    res.json({ message: 'Diajukan ke admin' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Kembalikan ke draft
router.put('/:id/back', operatorOrAdmin, async (req, res) => {
  try {
    const su = scopedUnitId(req);
    const where = su ? 'id=? AND unit_id=?' : 'id=?';
    const params = su ? [req.params.id, su] : [req.params.id];
    const [[p]] = await db.query(`SELECT * FROM procurements WHERE ${where}`, params);
    if (!p) return res.status(404).json({ message: 'Tidak ditemukan' });
    if (p.status !== 'diajukan' && p.status !== 'ditolak') return res.status(400).json({ message: 'Tidak bisa dikembalikan' });
    await db.query(`UPDATE procurements SET status='draft' WHERE id=?`, [p.id]);
    res.json({ message: 'Kembali ke draft' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Approve (admin)
router.put('/:id/approve', adminOnly, async (req, res) => {
  try {
    const [[p]] = await db.query('SELECT * FROM procurements WHERE id=?', [req.params.id]);
    if (!p) return res.status(404).json({ message: 'Tidak ditemukan' });
    if (p.status !== 'diajukan') return res.status(400).json({ message: 'Hanya pengajuan yang bisa disetujui' });
    await db.query(
      `UPDATE procurements SET status='disetujui', approved_by=?, approved_at=NOW() WHERE id=?`,
      [req.user.id, p.id]
    );
    res.json({ message: 'Rencana disetujui' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Reject (admin)
router.put('/:id/reject', adminOnly, async (req, res) => {
  try {
    const [[p]] = await db.query('SELECT * FROM procurements WHERE id=?', [req.params.id]);
    if (!p) return res.status(404).json({ message: 'Tidak ditemukan' });
    if (p.status !== 'diajukan') return res.status(400).json({ message: 'Hanya pengajuan yang bisa ditolak' });
    await db.query(
      `UPDATE procurements SET status='ditolak', approved_by=?, approved_at=NOW() WHERE id=?`,
      [req.user.id, p.id]
    );
    res.json({ message: 'Rencana ditolak' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Kode aset baru (sama pola dengan assets.js)
async function genCode(unitCode) {
  const year = new Date().getFullYear();
  const [rows] = await db.query(
    'SELECT COUNT(*) as c FROM assets a JOIN units u ON u.id=a.unit_id WHERE u.code=? AND YEAR(a.created_at)=?',
    [unitCode, year]
  );
  const seq = String((rows[0].c || 0) + 1).padStart(4, '0');
  return `ALM/${unitCode}/${year}/${seq}`;
}

// Terima barang: isi realisasi + auto buat aset
router.put('/items/:itemId/receive', operatorOrAdmin, async (req, res) => {
  try {
    const { real_price, real_qty, vendor, brand, serial_number, purchase_year, notes } = req.body;
    const [[i]] = await db.query(
      `SELECT i.*, p.unit_id, p.status as p_status, p.id as pid, u.code as unit_code
       FROM procurement_items i
       JOIN procurements p ON p.id=i.procurement_id
       JOIN units u ON u.id=p.unit_id
       WHERE i.id=?`,
      [req.params.itemId]
    );
    if (!i) return res.status(404).json({ message: 'Tidak ditemukan' });
    const su = scopedUnitId(req);
    if (su && String(i.unit_id) !== String(su)) return res.status(403).json({ message: 'Bukan rencana unit Anda' });
    if (i.p_status !== 'disetujui') return res.status(400).json({ message: 'Rencana belum disetujui admin' });
    if (i.received) return res.status(400).json({ message: 'Item sudah diterima' });

    const qty = Number(real_qty || i.qty || 1);
    const price = Number(real_price || i.unit_price || 0);

    // Kategori fallback kalau item tanpa kategori
    let catId = i.category_id;
    if (!catId) {
      const [[def]] = await db.query('SELECT id FROM categories ORDER BY id LIMIT 1');
      catId = def ? def.id : null;
    }
    if (!catId) return res.status(400).json({ message: 'Item tanpa kategori dan tidak ada kategori default. Isi kategori item / buat master kategori.' });

    // Buat aset baru
    const asset_code = await genCode(i.unit_code);
    const [r] = await db.query(
      `INSERT INTO assets (asset_code,name,category_id,unit_id,brand,serial_number,purchase_year,purchase_price,\`condition\`,description)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [asset_code, i.name, catId, i.unit_id, brand || null, serial_number || null, purchase_year || new Date().getFullYear(), price, 'baik', notes || `Pengadaan: ${i.name} x${qty}${vendor ? ' - ' + vendor : ''}`]
    );

    await db.query(
      `UPDATE procurement_items SET real_price=?, real_qty=?, vendor=?, received=1, asset_id=? WHERE id=?`,
      [price, qty, vendor || i.vendor || null, r.insertId, i.id]
    );
    await recalc(i.pid);
    await logAudit(req, 'receive', 'procurement_item', i.id, { asset_code, asset_id: r.insertId, price, qty });

    // Kalau semua item sudah diterima -> selesai
    const [[cnt]] = await db.query(
      'SELECT COUNT(*) as total, COALESCE(SUM(received=1),0) as done FROM procurement_items WHERE procurement_id=?',
      [i.pid]
    );
    const total = Number(cnt.total), done = Number(cnt.done);
    if (total > 0 && total === done) {
      await db.query(`UPDATE procurements SET status='selesai' WHERE id=?`, [i.pid]);
    }

    res.json({ message: 'Diterima, aset dibuat', asset_code, asset_id: r.insertId });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Hapus rencana (hanya yang belum ada item diterima)
router.delete('/:id', operatorOrAdmin, async (req, res) => {
  try {
    const su = scopedUnitId(req);
    const where = su ? 'id=? AND unit_id=?' : 'id=?';
    const params = su ? [req.params.id, su] : [req.params.id];
    const [[p]] = await db.query(`SELECT * FROM procurements WHERE ${where}`, params);
    if (!p) return res.status(404).json({ message: 'Tidak ditemukan' });
    const [cnt] = await db.query('SELECT COUNT(*) c FROM procurement_items WHERE procurement_id=? AND received=1', [p.id]);
    if (cnt[0].c) return res.status(400).json({ message: 'Ada item sudah diterima, tidak bisa dihapus' });
    await db.query('DELETE FROM procurements WHERE id=?', [p.id]);
    res.json({ message: 'Dihapus' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
