const express = require('express');
const db = require('../config/db');
const { auth, adminOnly, scopeUnit } = require('../middleware/auth');
const router = express.Router();
router.use(auth());
router.use(scopeUnit);

// Audit trail — admin melihat semua, operator/viewer hanya baris milik unitnya
// (baris dengan unit_id di detail JSON difilter di aplikasi via cek entity pada aset unit)
router.get('/', adminOnly, async (req, res) => {
  try {
    const { action, entity, user_id, from, to, search, limit } = req.query;
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const p = [];
    if (action) { sql += ' AND action=?'; p.push(action); }
    if (entity) { sql += ' AND entity=?'; p.push(entity); }
    if (user_id) { sql += ' AND user_id=?'; p.push(user_id); }
    if (from) { sql += ' AND created_at>=?'; p.push(from); }
    if (to) { sql += ' AND created_at<?'; p.push(to ? to + ' 23:59:59' : to); }
    if (search) { sql += ' AND (user_name LIKE ? OR detail LIKE ? OR entity LIKE ?)'; p.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ' ORDER BY id DESC LIMIT ?';
    p.push(Math.min(parseInt(limit, 10) || 100, 500));
    const [rows] = await db.query(sql, p);
    const [[cnt]] = await db.query('SELECT COUNT(*) as c FROM audit_logs');
    res.json({ rows, total: cnt.c });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Filter opsi untuk dropdown
router.get('/meta', adminOnly, async (req, res) => {
  try {
    const [actions] = await db.query('SELECT DISTINCT action FROM audit_logs ORDER BY action');
    const [entities] = await db.query('SELECT DISTINCT entity FROM audit_logs ORDER BY entity');
    const [users] = await db.query('SELECT DISTINCT user_id, user_name FROM audit_logs WHERE user_id IS NOT NULL ORDER BY user_name');
    res.json({
      actions: actions.map(r => r.action),
      entities: entities.map(r => r.entity),
      users
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// CSV audit trail
router.get('/csv', adminOnly, async (req, res) => {
  try {
    const { action, entity, from, to, search } = req.query;
    let sql = 'SELECT created_at, user_name, user_role, action, entity, entity_id, detail, ip FROM audit_logs WHERE 1=1';
    const p = [];
    if (action) { sql += ' AND action=?'; p.push(action); }
    if (entity) { sql += ' AND entity=?'; p.push(entity); }
    if (from) { sql += ' AND created_at>=?'; p.push(from); }
    if (to) { sql += ' AND created_at<?'; p.push(to + ' 23:59:59'); }
    if (search) { sql += ' AND (user_name LIKE ? OR detail LIKE ?)'; p.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY id DESC LIMIT 5000';
    const [rows] = await db.query(sql, p);
    const esc = v => String(v ?? '').replace(/[\r\n;]/g, ' ');
    const header = 'waktu;user;role;aksi;entitas;id;detail;ip\n';
    const body = rows.map(r => [r.created_at, r.user_name || '', r.user_role || '', r.action, r.entity, r.entity_id || '', esc(r.detail), r.ip || ''].join(';')).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment('audit-trail.csv');
    res.send(header + body);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
