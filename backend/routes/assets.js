const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { auth, scopeUnit, operatorOrAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(auth());
router.use(scopeUnit);

function scopedUnitId(req) {
  return req.scopedUnitId || null; // null = admin (semua unit)
}

const dir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

function removePhoto(photoPath) {
  if (!photoPath) return;
  try {
    const rel = photoPath.replace(/^\/+/, '');
    const full = path.join(__dirname, '..', rel);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (e) { /* abaikan */ }
}

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
    const su = scopedUnitId(req);
    if (su) { sql += ' AND a.unit_id=?'; p.push(su); }
    else if (unit_id) { sql += ' AND a.unit_id=?'; p.push(unit_id); }
    if (category_id) { sql += ' AND a.category_id=?'; p.push(category_id); }
    if (condition) { sql += ' AND a.`condition`=?'; p.push(condition); }
    if (search) { sql += ' AND (a.name LIKE ? OR a.asset_code LIKE ? OR a.brand LIKE ?)'; p.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ' ORDER BY a.created_at DESC';
    const [rows] = await db.query(sql, p);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/lookup/:code', async (req, res) => {
  try {
    const su = scopedUnitId(req);
    const code = decodeURIComponent(req.params.code);
    const baseWhere = su ? 'a.asset_code=? AND a.unit_id=?' : 'a.asset_code=?';
    const baseParams = su ? [code, su] : [code];
    const [rows] = await db.query(
      `SELECT a.*, u.code as unit_code, u.name as unit_name,
        c.name as category_name, l.name as location_name
       FROM assets a
       JOIN units u ON u.id=a.unit_id
       JOIN categories c ON c.id=a.category_id
       LEFT JOIN locations l ON l.id=a.location_id
       WHERE ${baseWhere}`,
      baseParams
    );
    if (!rows.length) return res.status(404).json({ message: 'Aset tidak ditemukan' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  const su = scopedUnitId(req);
  const baseWhere = su ? 'a.id=? AND a.unit_id=?' : 'a.id=?';
  const baseParams = su ? [req.params.id, su] : [req.params.id];
  const [rows] = await db.query(
    `SELECT a.*, u.code as unit_code, u.name as unit_name,
      c.name as category_name, l.name as location_name
     FROM assets a
     JOIN units u ON u.id=a.unit_id
     JOIN categories c ON c.id=a.category_id
     LEFT JOIN locations l ON l.id=a.location_id
     WHERE ${baseWhere}`,
    baseParams
  );
  if (!rows.length) return res.status(404).json({ message: 'Tidak ditemukan' });
  const asset = rows[0];
  const [muts] = await db.query(
    `SELECT m.*, fu.code as from_unit, tu.code as to_unit FROM mutations m
     LEFT JOIN units fu ON fu.id=m.from_unit_id
     JOIN units tu ON tu.id=m.to_unit_id
     WHERE m.asset_id=? ORDER BY m.created_at DESC`,
    [asset.id]
  );
  const [servs] = await db.query(
    'SELECT * FROM maintenances WHERE asset_id=? ORDER BY maintenance_date DESC',
    [asset.id]
  );
  res.json({ ...asset, mutations: muts, maintenances: servs });
});

router.post('/', operatorOrAdmin, upload.single('photo'), async (req, res) => {
  try {
    let { name, category_id, unit_id, location_id, brand, serial_number, purchase_year, purchase_price, condition, description } = req.body || {};
    if (!name || !category_id) return res.status(400).json({ message: 'Nama dan kategori wajib diisi' });
    const su = scopedUnitId(req);
    if (su) unit_id = su; // operator terkunci ke unitnya
    if (!unit_id) return res.status(400).json({ message: 'Unit wajib diisi' });
    const [[unit]] = await db.query('SELECT code FROM units WHERE id=?', [unit_id]);
    if (!unit) return res.status(400).json({ message: 'Unit tidak valid' });
    if (location_id) {
      const [[loc]] = await db.query('SELECT unit_id FROM locations WHERE id=?', [location_id]);
      if (!loc || String(loc.unit_id) !== String(unit_id)) return res.status(400).json({ message: 'Lokasi tidak sesuai unit' });
    }
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

router.put('/:id', operatorOrAdmin, upload.single('photo'), async (req, res) => {
  try {
    let { name, category_id, unit_id, location_id, brand, serial_number, purchase_year, purchase_price, condition, status, description } = req.body;
    const su = scopedUnitId(req);
    if (su) {
      const [[cur]] = await db.query('SELECT unit_id FROM assets WHERE id=?', [req.params.id]);
      if (!cur || String(cur.unit_id) !== String(su)) return res.status(403).json({ message: 'Bukan aset unit Anda' });
      unit_id = su;
    }
    const photo = req.file ? `/uploads/${req.file.filename}` : undefined;
    if (photo) {
      const [[old]] = await db.query('SELECT photo FROM assets WHERE id=?', [req.params.id]);
      if (old?.photo) removePhoto(old.photo);
    }
    let sql = 'UPDATE assets SET name=?,category_id=?,unit_id=?,location_id=?,brand=?,serial_number=?,purchase_year=?,purchase_price=?,`condition`=?,status=?,description=?';
    const p = [name, category_id, unit_id, location_id || null, brand, serial_number, purchase_year || null, purchase_price || 0, condition, status || 'aktif', description];
    if (photo) { sql += ',photo=?'; p.push(photo); }
    sql += ' WHERE id=?'; p.push(req.params.id);
    await db.query(sql, p);
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', operatorOrAdmin, async (req, res) => {
  const su = scopedUnitId(req);
  const [[cur]] = await db.query('SELECT unit_id, photo FROM assets WHERE id=?', [req.params.id]);
  if (!cur) return res.status(404).json({ message: 'Tidak ditemukan' });
  if (su && String(cur.unit_id) !== String(su)) {
    return res.status(403).json({ message: 'Bukan aset unit Anda' });
  }
  await db.query('DELETE FROM assets WHERE id=?', [req.params.id]);
  removePhoto(cur.photo);
  res.json({ message: 'Dihapus' });
});

module.exports = router;
