const express = require('express');
const db = require('../config/db');
const { auth, adminOnly, operatorOrAdmin, scopeUnit } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const { notifyAdmins, notifyUser } = require('../helpers/notify');
const router = express.Router();
router.use(auth());
router.use(scopeUnit);

function scopedUnitId(req) {
  return req.scopedUnitId || null; // null = admin
}

// List penghapusan (operator: hanya unitnya)
router.get('/', async (req, res) => {
  try {
    const su = scopedUnitId(req);
    let sql = `SELECT d.*, a.asset_code, a.name as asset_name, u.code as unit_code,
        cu.name as created_name, au.name as approved_name
      FROM disposals d
      JOIN assets a ON a.id=d.asset_id
      JOIN units u ON u.id=a.unit_id
      LEFT JOIN users cu ON cu.id=d.created_by
      LEFT JOIN users au ON au.id=d.approved_by
      WHERE 1=1`;
    const p = [];
    if (su) { sql += ' AND a.unit_id=?'; p.push(su); }
    sql += ' ORDER BY d.created_at DESC';
    const [rows] = await db.query(sql, p);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Ajukan penghapusan (admin langsung approved)
router.post('/', operatorOrAdmin, async (req, res) => {
  const { asset_id, disposal_date, reason, description, ba_number } = req.body;
  if (!asset_id || !disposal_date || !reason) return res.status(400).json({ message: 'Aset, tanggal, dan alasan wajib diisi' });
  try {
    const [[asset]] = await db.query('SELECT unit_id, status FROM assets WHERE id=?', [asset_id]);
    if (!asset) return res.status(404).json({ message: 'Aset tidak ditemukan' });
    const su = scopedUnitId(req);
    if (su && String(asset.unit_id) !== String(su)) return res.status(403).json({ message: 'Bukan aset unit Anda' });
    if (asset.status === 'dihapus') return res.status(400).json({ message: 'Aset sudah dihapus' });
    const [[dup]] = await db.query("SELECT COUNT(*) as c FROM disposals WHERE asset_id=? AND status='pending'", [asset_id]);
    if (dup.c > 0) return res.status(400).json({ message: 'Sudah ada pengajuan pending untuk aset ini' });
    const isAdmin = req.user.role === 'admin';
    const status = isAdmin ? 'approved' : 'pending';
    const [r] = await db.query(
      'INSERT INTO disposals (asset_id, disposal_date, reason, description, ba_number, status, created_by) VALUES (?,?,?,?,?,?,?)',
      [asset_id, disposal_date, reason, description || null, ba_number || null, status, req.user.id]
    );
    if (isAdmin) {
      await db.query("UPDATE disposals SET approved_by=?, approved_at=NOW() WHERE id=?", [req.user.id, r.insertId]);
      const newCond = reason === 'hilang' ? 'hilang' : 'rusak_berat';
      await db.query("UPDATE assets SET status='dihapus', `condition`=? WHERE id=?", [newCond, asset_id]);
      await logAudit(req, 'delete', 'disposal', r.insertId, { asset_id, reason, via: 'admin_direct' });
      return res.json({ message: 'Aset dihapus' });
    }
    await logAudit(req, 'create', 'disposal', r.insertId, { asset_id, reason, status: 'pending' });
    await notifyAdmins(req.user.id, {
      title: 'Pengajuan penghapusan menunggu persetujuan',
      message: `${req.user.name} mengajukan penghapusan aset #${asset_id} (${reason})`,
      type: 'approval', link: '/hapus'
    });
    res.json({ message: 'Pengajuan penghapusan dikirim, menunggu persetujuan admin' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/approve', adminOnly, async (req, res) => {
  try {
    const [[d]] = await db.query('SELECT * FROM disposals WHERE id=?', [req.params.id]);
    if (!d) return res.status(404).json({ message: 'Tidak ditemukan' });
    if (d.status !== 'pending') return res.status(400).json({ message: 'Sudah diproses' });
    await db.query("UPDATE disposals SET status='approved', approved_by=?, approved_at=NOW() WHERE id=?", [req.user.id, d.id]);
    const newCond = d.reason === 'hilang' ? 'hilang' : 'rusak_berat';
    await db.query("UPDATE assets SET status='dihapus', `condition`=? WHERE id=?", [newCond, d.asset_id]);
    await logAudit(req, 'approve', 'disposal', d.id, { asset_id: d.asset_id, reason: d.reason });
    if (d.created_by) {
      await notifyUser(d.created_by, {
        title: 'Penghapusan disetujui',
        message: `Penghapusan aset #${d.asset_id} disetujui ${req.user.name}`,
        type: 'approval', link: '/hapus'
      });
    }
    res.json({ message: 'Penghapusan disetujui, aset berstatus dihapus' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/reject', adminOnly, async (req, res) => {
  try {
    const [[d]] = await db.query('SELECT * FROM disposals WHERE id=?', [req.params.id]);
    if (!d) return res.status(404).json({ message: 'Tidak ditemukan' });
    if (d.status !== 'pending') return res.status(400).json({ message: 'Sudah diproses' });
    await db.query("UPDATE disposals SET status='rejected', approved_by=?, approved_at=NOW() WHERE id=?", [req.user.id, d.id]);
    await logAudit(req, 'reject', 'disposal', d.id, { asset_id: d.asset_id });
    if (d.created_by) {
      await notifyUser(d.created_by, {
        title: 'Penghapusan ditolak',
        message: `Penghapusan aset #${d.asset_id} ditolak ${req.user.name}`,
        type: 'approval', link: '/hapus'
      });
    }
    res.json({ message: 'Penghapusan ditolak' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Cetak berita acara (teks siap print)
router.get('/:id/ba', async (req, res) => {
  try {
    const su = scopedUnitId(req);
    const [[d]] = await db.query(
      `SELECT d.*, a.asset_code, a.name as asset_name, a.brand, a.serial_number, a.purchase_year, a.purchase_price,
        u.name as unit_name, c.name as category_name, cu.name as created_name
       FROM disposals d
       JOIN assets a ON a.id=d.asset_id
       JOIN units u ON u.id=a.unit_id
       JOIN categories c ON c.id=a.category_id
       LEFT JOIN users cu ON cu.id=d.created_by
       WHERE d.id=?`,
      [req.params.id]
    );
    if (!d) return res.status(404).json({ message: 'Tidak ditemukan' });
    if (su) {
      const [[a]] = await db.query('SELECT unit_id FROM assets WHERE id=?', [d.asset_id]);
      if (!a || String(a.unit_id) !== String(su)) return res.status(403).json({ message: 'Bukan aset unit Anda' });
    }
    res.json(d);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
