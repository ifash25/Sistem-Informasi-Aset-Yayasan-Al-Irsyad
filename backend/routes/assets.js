const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth());

const dir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

async function genCode(unitCode) {
  const year = new Date().getFullYear();
  const [rows] = await db.query(
    'SELECT COUNT(*) as c FROM assets a JOIN units u ON u.id=a.unit_id WHERE u.code=? AND YEAR(a.created_at)=?',
    [unitCode, year]
  );
  const seq = String((rows[0].c || 0) + 1).padStart(4, '0');
  return `ALM/${unitCode}/${year}/${seq}`;
}

router.get('/', async (req, res) => {
  try {
    const { unit_id, category_id, condition, search } = req.query;
    let sql = `SELECT a.*, u.code as unit_code, u.name as unit_name,
      c.name as category_name, l.name as location_name
      FROM assets a
      JOIN units u ON u.id=a.unit_id
      JOIN categories c ON c.id=a.category_id
      LEFT JOIN locations l ON l.id=a.location_id WHERE 1=1`;
    const p = [];
    if (unit_id) { sql += ' AND a.unit_id=?'; p.push(unit_id); }
    if (category_id) { sql += ' AND a.category_id=?'; p.push(category_id); }
    if (condition) { sql += ' AND a.`condition`=?'; p.push(condition); }
    if (search) { sql += ' AND (a.name LIKE ? OR a.asset_code LIKE ? OR a.brand LIKE ?)'; p.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ' ORDER BY a.created_at DESC';
    const [rows] = await db.query(sql, p);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM assets WHERE id=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Tidak ditemukan' });
  res.json(rows[0]);
});

router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { name, category_id, unit_id, location_id, brand, serial_number, purchase_year, purchase_price, condition, description } = req.body;
    const [[unit]] = await db.query('SELECT code FROM units WHERE id=?', [unit_id]);
    if (!unit) return res.status(400).json({ message: 'Unit tidak valid' });
    const asset_code = await genCode(unit.code);
    const photo = req.file ? `/uploads/${req.file.filename}` : null;
    const [r] = await db.query(
      `INSERT INTO assets (asset_code,name,category_id,unit_id,location_id,brand,serial_number,purchase_year,purchase_price,\`condition\`,photo,description)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [asset_code, name, category_id, unit_id, location_id || null, brand || null, serial_number || null, purchase_year || null, purchase_price || 0, condition || 'baik', photo, description || null]
    );
    res.json({ id: r.insertId, asset_code });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const { name, category_id, unit_id, location_id, brand, serial_number, purchase_year, purchase_price, condition, status, description } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : undefined;
    let sql = 'UPDATE assets SET name=?,category_id=?,unit_id=?,location_id=?,brand=?,serial_number=?,purchase_year=?,purchase_price=?,`condition`=?,status=?,description=?';
    const p = [name, category_id, unit_id, location_id || null, brand, serial_number, purchase_year || null, purchase_price || 0, condition, status || 'aktif', description];
    if (photo) { sql += ',photo=?'; p.push(photo); }
    sql += ' WHERE id=?'; p.push(req.params.id);
    await db.query(sql, p);
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM assets WHERE id=?', [req.params.id]);
  res.json({ message: 'Dihapus' });
});

module.exports = router;
