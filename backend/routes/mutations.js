const express = require('express');
const db = require('../config/db');
const { auth, adminOnly, operatorOrAdmin, scopeUnit } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');
const { notifyAdmins } = require('../helpers/notify');
const router = express.Router();
router.use(auth());
router.use(scopeUnit);

function scopedUnitId(req) {
  return req.scopedUnitId || null; // null = admin
}

router.get('/', async (req, res) => {
  const su = scopedUnitId(req);
  let sql = `SELECT m.*, a.asset_code, a.name as asset_name,
      fu.code as from_unit, tu.code as to_unit
     FROM mutations m
     JOIN assets a ON a.id=m.asset_id
     LEFT JOIN units fu ON fu.id=m.from_unit_id
     JOIN units tu ON tu.id=m.to_unit_id
     WHERE 1=1`;
  const p = [];
  if (su) { sql += ' AND (m.from_unit_id=? OR m.to_unit_id=?)'; p.push(su, su); }
  sql += ' ORDER BY m.created_at DESC';
  const [rows] = await db.query(sql, p);
  res.json(rows);
});

router.post('/', operatorOrAdmin, async (req, res) => {
  let { asset_id, to_unit_id, to_location_id, mutation_date, reason } = req.body;
  try {
    const [[asset]] = await db.query('SELECT unit_id, location_id FROM assets WHERE id=?', [asset_id]);
    if (!asset) return res.status(404).json({ message: 'Aset tidak ditemukan' });
    const su = scopedUnitId(req);
    if (su && String(asset.unit_id) !== String(su)) {
      return res.status(403).json({ message: 'Hanya bisa memutasi aset unit Anda' });
    }
    const isAdmin = req.user.role === 'admin';
    const status = isAdmin ? 'approved' : 'pending';
    const [r] = await db.query(
      'INSERT INTO mutations (asset_id, from_unit_id, to_unit_id, from_location_id, to_location_id, mutation_date, reason, status, created_by) VALUES (?,?,?,?,?,?,?,?,?)',
      [asset_id, asset.unit_id, to_unit_id, asset.location_id, to_location_id || null, mutation_date, reason || null, status, req.user.id]
    );
    if (isAdmin) {
      await db.query('UPDATE assets SET unit_id=?, location_id=? WHERE id=?', [to_unit_id, to_location_id || null, asset_id]);
      await db.query('UPDATE mutations SET approved_by=?, approved_at=NOW() WHERE id=?', [req.user.id, r.insertId]);
      await logAudit(req, 'create', 'mutation', r.insertId, { asset_id, to_unit_id, via: 'admin_direct' });
      return res.json({ message: 'Mutasi berhasil' });
    }
    await logAudit(req, 'create', 'mutation', r.insertId, { asset_id, to_unit_id, status: 'pending' });
    await notifyAdmins(req.user.id, {
      title: 'Pengajuan mutasi menunggu persetujuan',
      message: `${req.user.name} mengajukan pemindahan aset #${asset_id} ke unit ${to_unit_id}`,
      type: 'approval', link: '/mutasi'
    });
    res.json({ message: 'Pengajuan mutasi dikirim, menunggu persetujuan admin' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/approve', adminOnly, async (req, res) => {
  try {
    const [[m]] = await db.query('SELECT * FROM mutations WHERE id=?', [req.params.id]);
    if (!m) return res.status(404).json({ message: 'Mutasi tidak ditemukan' });
    if (m.status !== 'pending') return res.status(400).json({ message: 'Mutasi sudah diproses' });
    await db.query('UPDATE assets SET unit_id=?, location_id=? WHERE id=?', [m.to_unit_id, m.to_location_id, m.asset_id]);
    await db.query("UPDATE mutations SET status='approved', approved_by=?, approved_at=NOW() WHERE id=?", [req.user.id, m.id]);
    await logAudit(req, 'approve', 'mutation', m.id, { asset_id: m.asset_id, to_unit_id: m.to_unit_id });
    res.json({ message: 'Mutasi disetujui' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/reject', adminOnly, async (req, res) => {
  try {
    const [[m]] = await db.query('SELECT * FROM mutations WHERE id=?', [req.params.id]);
    if (!m) return res.status(404).json({ message: 'Mutasi tidak ditemukan' });
    if (m.status !== 'pending') return res.status(400).json({ message: 'Mutasi sudah diproses' });
    await db.query("UPDATE mutations SET status='rejected', approved_by=?, approved_at=NOW() WHERE id=?", [req.user.id, m.id]);
    await logAudit(req, 'reject', 'mutation', m.id, { asset_id: m.asset_id });
    res.json({ message: 'Mutasi ditolak' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/maintenances', async (req, res) => {
  const su = scopedUnitId(req);
  let sql = `SELECT mt.*, a.asset_code, a.name as asset_name FROM maintenances mt
     JOIN assets a ON a.id=mt.asset_id WHERE 1=1`;
  const p = [];
  if (su) { sql += ' AND a.unit_id=?'; p.push(su); }
  sql += ' ORDER BY mt.maintenance_date DESC';
  const [rows] = await db.query(sql, p);
  res.json(rows);
});

router.post('/maintenances', operatorOrAdmin, async (req, res) => {
  const { asset_id, maintenance_date, type, cost, vendor, notes } = req.body;
  try {
    const su = scopedUnitId(req);
    if (su) {
      const [[a]] = await db.query('SELECT unit_id FROM assets WHERE id=?', [asset_id]);
      if (!a || String(a.unit_id) !== String(su)) return res.status(403).json({ message: 'Bukan aset unit Anda' });
    }
    await db.query(
      'INSERT INTO maintenances (asset_id, maintenance_date, type, cost, vendor, notes) VALUES (?,?,?,?,?,?)',
      [asset_id, maintenance_date, type, cost || 0, vendor || null, notes || null]
    );
    res.json({ message: 'Riwayat servis tersimpan' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
