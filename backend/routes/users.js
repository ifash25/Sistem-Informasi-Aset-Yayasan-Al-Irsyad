const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');
const { logAudit } = require('../helpers/audit');

const router = express.Router();
router.use(auth());

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT u.id, u.name, u.email, u.role, u.unit_id, un.code as unit_code, un.name as unit_name, u.created_at FROM users u LEFT JOIN units un ON un.id=u.unit_id ORDER BY u.id'
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', auth(), adminOnly, async (req, res) => {
  const { name, email, password, role, unit_id } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Nama, email, password wajib diisi' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.query(
      'INSERT INTO users (name,email,password,role,unit_id) VALUES (?,?,?,?,?)',
      [name, email, hash, role || 'operator', unit_id || null]
    );
    await logAudit(req, 'create', 'user', r.insertId, { name, email, role: role || 'operator', unit_id: unit_id || null });
    res.json({ id: r.insertId, message: 'User dibuat' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email sudah dipakai' });
    res.status(500).json({ message: e.message });
  }
});

router.put('/:id', adminOnly, async (req, res) => {
  const { name, role, unit_id, password } = req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET name=?, role=?, unit_id=?, password=? WHERE id=?', [name, role, unit_id || null, hash, req.params.id]);
    } else {
      await db.query('UPDATE users SET name=?, role=?, unit_id=? WHERE id=?', [name, role, unit_id || null, req.params.id]);
    }
    await logAudit(req, 'update', 'user', req.params.id, { name, role, unit_id: unit_id || null, reset_password: !!password });
    res.json({ message: 'User diupdate' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    if (String(req.user.id) === String(req.params.id)) return res.status(400).json({ message: 'Tidak bisa hapus akun sendiri' });
    await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
    await logAudit(req, 'delete', 'user', req.params.id, {});
    res.json({ message: 'User dihapus' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
