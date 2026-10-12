const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT u.*, un.code as unit_code, un.name as unit_name FROM users u LEFT JOIN units un ON un.id=u.unit_id WHERE u.email=?',
      [email]
    );
    if (!rows.length) return res.status(401).json({ message: 'Email/password salah' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Email/password salah' });
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, unit_id: user.unit_id },
      process.env.JWT_SECRET || 'alirsyad_secret_2026',
      { expiresIn: '12h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, unit_id: user.unit_id, unit_name: user.unit_name } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/register', async (req, res) => {
  const { name, email, password, role, unit_id } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (name,email,password,role,unit_id) VALUES (?,?,?,?,?)',
      [name, email, hash, role || 'operator', unit_id || null]);
    res.json({ message: 'User dibuat' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
