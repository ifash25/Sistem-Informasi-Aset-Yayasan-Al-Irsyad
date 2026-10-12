const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const router = express.Router();
router.use(auth());

router.get('/', async (req, res) => {
  const [rows] = await db.query(
    `SELECT m.*, a.asset_code, a.name as asset_name,
      fu.code as from_unit, tu.code as to_unit
     FROM mutations m
     JOIN assets a ON a.id=m.asset_id
     LEFT JOIN units fu ON fu.id=m.from_unit_id
     JOIN units tu ON tu.id=m.to_unit_id
     ORDER BY m.created_at DESC`
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { asset_id, to_unit_id, to_location_id, mutation_date, reason } = req.body;
  try {
    const [[asset]] = await db.query('SELECT unit_id, location_id FROM assets WHERE id=?', [asset_id]);
    if (!asset) return res.status(404).json({ message: 'Aset tidak ditemukan' });
    await db.query(
      'INSERT INTO mutations (asset_id, from_unit_id, to_unit_id, from_location_id, to_location_id, mutation_date, reason, created_by) VALUES (?,?,?,?,?,?,?,?)',
      [asset_id, asset.unit_id, to_unit_id, asset.location_id, to_location_id || null, mutation_date, reason || null, req.user.id]
    );
    await db.query('UPDATE assets SET unit_id=?, location_id=? WHERE id=?', [to_unit_id, to_location_id || null, asset_id]);
    res.json({ message: 'Mutasi berhasil' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/maintenances', async (req, res) => {
  const [rows] = await db.query(
    `SELECT mt.*, a.asset_code, a.name as asset_name FROM maintenances mt
     JOIN assets a ON a.id=mt.asset_id ORDER BY mt.maintenance_date DESC`
  );
  res.json(rows);
});

router.post('/maintenances', async (req, res) => {
  const { asset_id, maintenance_date, type, cost, vendor, notes } = req.body;
  try {
    await db.query(
      'INSERT INTO maintenances (asset_id, maintenance_date, type, cost, vendor, notes) VALUES (?,?,?,?,?,?)',
      [asset_id, maintenance_date, type, cost || 0, vendor || null, notes || null]
    );
    res.json({ message: 'Riwayat servis tersimpan' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
