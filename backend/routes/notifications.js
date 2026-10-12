const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const router = express.Router();
router.use(auth());

// Daftar notifikasi milik user login (terbaru dulu)
router.get('/', async (req, res) => {
  try {
    const { unread_only, limit } = req.query;
    let sql = 'SELECT * FROM notifications WHERE user_id=?';
    const p = [req.user.id];
    if (unread_only === '1') sql += ' AND is_read=0';
    sql += ' ORDER BY created_at DESC LIMIT ?';
    p.push(Math.min(parseInt(limit, 10) || 30, 100));
    const [rows] = await db.query(sql, p);
    const [[cnt]] = await db.query('SELECT COUNT(*) as unread FROM notifications WHERE user_id=? AND is_read=0', [req.user.id]);
    res.json({ rows, unread: cnt.unread });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Tandai sudah dibaca
router.put('/:id/read', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ message: 'OK' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Tandai semua dibaca
router.put('/read-all/all', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
    res.json({ message: 'OK' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
