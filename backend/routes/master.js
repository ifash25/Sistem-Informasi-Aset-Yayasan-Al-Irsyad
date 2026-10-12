const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const router = express.Router();
router.use(auth());

router.get('/units', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM units ORDER BY id');
  res.json(rows);
});
router.post('/units', async (req, res) => {
  const { code, name } = req.body;
  try {
    const [r] = await db.query('INSERT INTO units (code,name) VALUES (?,?)', [code, name]);
    res.json({ id: r.insertId, code, name });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/categories', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
  res.json(rows);
});
router.post('/categories', async (req, res) => {
  const { code, name } = req.body;
  try {
    const [r] = await db.query('INSERT INTO categories (code,name) VALUES (?,?)', [code, name]);
    res.json({ id: r.insertId, code, name });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/locations', async (req, res) => {
  const { unit_id } = req.query;
  let sql = 'SELECT l.*, u.code as unit_code, u.name as unit_name FROM locations l JOIN units u ON u.id=l.unit_id';
  const params = [];
  if (unit_id) { sql += ' WHERE l.unit_id=?'; params.push(unit_id); }
  sql += ' ORDER BY u.code, l.name';
  const [rows] = await db.query(sql, params);
  res.json(rows);
});
router.post('/locations', async (req, res) => {
  const { unit_id, name } = req.body;
  try {
    const [r] = await db.query('INSERT INTO locations (unit_id,name) VALUES (?,?)', [unit_id, name]);
    res.json({ id: r.insertId, unit_id, name });
  } catch (e) { res.status(500).json({ message: e.message }); }
});
router.delete('/locations/:id', async (req, res) => {
  await db.query('DELETE FROM locations WHERE id=?', [req.params.id]);
  res.json({ message: 'Dihapus' });
});

module.exports = router;
