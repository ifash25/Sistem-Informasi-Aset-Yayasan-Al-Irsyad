const express = require('express');
const db = require('../config/db');
const { auth, adminOnly, scopeUnit } = require('../middleware/auth');
const router = express.Router();
router.use(auth());
router.use(scopeUnit);

router.get('/units', async (req, res) => {
  if (req.scopedUnitId) {
    const [rows] = await db.query('SELECT * FROM units WHERE id=?', [req.scopedUnitId]);
    return res.json(rows);
  }
  const [rows] = await db.query('SELECT * FROM units ORDER BY id');
  res.json(rows);
});
router.post('/units', adminOnly, async (req, res) => {
  const { code, name } = req.body;
  if (!code || !name) return res.status(400).json({ message: 'Kode dan nama unit wajib diisi' });
  try {
    const [r] = await db.query('INSERT INTO units (code,name) VALUES (?,?)', [code.trim().toUpperCase(), name.trim()]);
    res.json({ id: r.insertId, code, name });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Kode unit sudah dipakai' });
    res.status(500).json({ message: e.message });
  }
});
router.put('/units/:id', adminOnly, async (req, res) => {
  const { code, name } = req.body;
  if (!code || !name) return res.status(400).json({ message: 'Kode dan nama unit wajib diisi' });
  try {
    await db.query('UPDATE units SET code=?, name=? WHERE id=?', [code.trim().toUpperCase(), name.trim(), req.params.id]);
    res.json({ message: 'Unit diupdate' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Kode unit sudah dipakai' });
    res.status(500).json({ message: e.message });
  }
});
router.delete('/units/:id', adminOnly, async (req, res) => {
  try {
    const [[used]] = await db.query('SELECT COUNT(*) as c FROM assets WHERE unit_id=?', [req.params.id]);
    if (used.c > 0) return res.status(400).json({ message: `Unit masih dipakai ${used.c} aset, tidak bisa dihapus` });
    await db.query('DELETE FROM units WHERE id=?', [req.params.id]);
    res.json({ message: 'Unit dihapus' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/categories', async (req, res) => {
  try {
    if (req.scopedUnitId) {
      // operator/viewer: kategori global + milik unitnya sendiri
      const [rows] = await db.query(
        `SELECT c.*, u.code as unit_code, u.name as unit_name
         FROM categories c LEFT JOIN units u ON u.id=c.unit_id
         WHERE c.unit_id IS NULL OR c.unit_id=?
         ORDER BY c.unit_id IS NULL DESC, c.name`,
        [req.scopedUnitId]
      );
      return res.json(rows);
    }
    const [rows] = await db.query(
      `SELECT c.*, u.code as unit_code, u.name as unit_name
       FROM categories c LEFT JOIN units u ON u.id=c.unit_id
       ORDER BY c.unit_id IS NULL DESC, c.name`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
router.post('/categories', async (req, res) => {
  let { code, name, unit_id } = req.body;
  if (req.user.role !== 'admin' && !req.scopedUnitId) {
    return res.status(403).json({ message: 'Akses ditolak' });
  }
  // operator: kategori selalu milik unitnya; admin: unit_id opsional (kosong = global)
  if (req.scopedUnitId) unit_id = req.scopedUnitId;
  else if (!unit_id) unit_id = null;
  if (!code || !name) return res.status(400).json({ message: 'Kode dan nama kategori wajib diisi' });
  try {
    // cek duplikat per lingkup (NULL = 1 kelompok global)
    const [dup] = await db.query(
      unit_id ? 'SELECT id FROM categories WHERE code=? AND unit_id=?' : 'SELECT id FROM categories WHERE code=? AND unit_id IS NULL',
      unit_id ? [code.trim().toUpperCase(), unit_id] : [code.trim().toUpperCase()]
    );
    if (dup.length) return res.status(400).json({ message: 'Kode kategori sudah dipakai di lingkup ini' });
    const [r] = await db.query('INSERT INTO categories (code,name,unit_id) VALUES (?,?,?)', [code.trim().toUpperCase(), name.trim(), unit_id]);
    res.json({ id: r.insertId, code: code.trim().toUpperCase(), name: name.trim(), unit_id });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Kode kategori sudah dipakai' });
    res.status(500).json({ message: e.message });
  }
});
router.put('/categories/:id', async (req, res) => {
  let { code, name, unit_id } = req.body;
  if (req.user.role !== 'admin' && !req.scopedUnitId) {
    return res.status(403).json({ message: 'Akses ditolak' });
  }
  try {
    const [[cur]] = await db.query('SELECT * FROM categories WHERE id=?', [req.params.id]);
    if (!cur) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    // operator hanya boleh ubah kategori unitnya; unit tidak bisa dipindah
    if (req.scopedUnitId) {
      if (String(cur.unit_id) !== String(req.scopedUnitId)) {
        return res.status(403).json({ message: 'Bukan kategori unit Anda' });
      }
      unit_id = req.scopedUnitId;
    } else {
      unit_id = cur.unit_id; // admin: unit tidak diubah via form ini
    }
    const [dup] = await db.query(
      unit_id ? 'SELECT id FROM categories WHERE code=? AND unit_id=? AND id<>?' : 'SELECT id FROM categories WHERE code=? AND unit_id IS NULL AND id<>?',
      unit_id ? [code.trim().toUpperCase(), unit_id, cur.id] : [code.trim().toUpperCase(), cur.id]
    );
    if (dup.length) return res.status(400).json({ message: 'Kode kategori sudah dipakai di lingkup ini' });
    await db.query('UPDATE categories SET code=?, name=? WHERE id=?', [code.trim().toUpperCase(), name.trim(), req.params.id]);
    res.json({ message: 'Kategori diupdate' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Kode kategori sudah dipakai' });
    res.status(500).json({ message: e.message });
  }
});
router.delete('/categories/:id', async (req, res) => {
  try {
    const [[cur]] = await db.query('SELECT * FROM categories WHERE id=?', [req.params.id]);
    if (!cur) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    if (req.scopedUnitId && String(cur.unit_id) !== String(req.scopedUnitId)) {
      return res.status(403).json({ message: 'Bukan kategori unit Anda' });
    }
    if (req.user.role !== 'admin' && !req.scopedUnitId) {
      return res.status(403).json({ message: 'Akses ditolak' });
    }
    const [[used]] = await db.query('SELECT COUNT(*) as c FROM assets WHERE category_id=?', [req.params.id]);
    if (used.c > 0) return res.status(400).json({ message: `Kategori masih dipakai ${used.c} aset, tidak bisa dihapus` });
    await db.query('DELETE FROM categories WHERE id=?', [req.params.id]);
    res.json({ message: 'Kategori dihapus' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/locations', async (req, res) => {
  const { unit_id } = req.query;
  let sql = 'SELECT l.*, u.code as unit_code, u.name as unit_name FROM locations l JOIN units u ON u.id=l.unit_id';
  const params = [];
  const conds = [];
  if (req.scopedUnitId) { conds.push('l.unit_id=?'); params.push(req.scopedUnitId); }
  else if (unit_id) { conds.push('l.unit_id=?'); params.push(unit_id); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY u.code, l.name';
  const [rows] = await db.query(sql, params);
  res.json(rows);
});
router.post('/locations', async (req, res) => {
  let { unit_id, name } = req.body;
  if (req.scopedUnitId) unit_id = req.scopedUnitId;
  if (!unit_id || !name) return res.status(400).json({ message: 'Unit dan nama lokasi wajib diisi' });
  try {
    const [r] = await db.query('INSERT INTO locations (unit_id,name) VALUES (?,?)', [unit_id, name.trim()]);
    res.json({ id: r.insertId, unit_id, name });
  } catch (e) { res.status(500).json({ message: e.message }); }
});
router.put('/locations/:id', async (req, res) => {
  let { unit_id, name } = req.body;
  if (!name) return res.status(400).json({ message: 'Nama lokasi wajib diisi' });
  try {
    const [[cur]] = await db.query('SELECT unit_id FROM locations WHERE id=?', [req.params.id]);
    if (!cur) return res.status(404).json({ message: 'Lokasi tidak ditemukan' });
    if (req.scopedUnitId) {
      if (String(cur.unit_id) !== String(req.scopedUnitId)) return res.status(403).json({ message: 'Bukan lokasi unit Anda' });
      unit_id = req.scopedUnitId;
    }
    await db.query('UPDATE locations SET unit_id=?, name=? WHERE id=?', [unit_id || cur.unit_id, name.trim(), req.params.id]);
    res.json({ message: 'Lokasi diupdate' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});
router.delete('/locations/:id', async (req, res) => {
  try {
    const [[cur]] = await db.query('SELECT unit_id FROM locations WHERE id=?', [req.params.id]);
    if (!cur) return res.status(404).json({ message: 'Lokasi tidak ditemukan' });
    if (req.scopedUnitId && String(cur.unit_id) !== String(req.scopedUnitId)) {
      return res.status(403).json({ message: 'Bukan lokasi unit Anda' });
    }
    if (req.user.role !== 'admin' && !req.scopedUnitId) {
      return res.status(403).json({ message: 'Akses ditolak' });
    }
    const [[used]] = await db.query('SELECT COUNT(*) as c FROM assets WHERE location_id=?', [req.params.id]);
    if (used.c > 0) return res.status(400).json({ message: `Lokasi masih dipakai ${used.c} aset, tidak bisa dihapus` });
    await db.query('DELETE FROM locations WHERE id=?', [req.params.id]);
    res.json({ message: 'Dihapus' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
