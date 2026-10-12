const db = require('../config/db');

// Buat notifikasi untuk satu user
async function notifyUser(userId, { title, message, type = 'info', link = null }) {
  try {
    await db.query(
      'INSERT INTO notifications (user_id,title,message,type,link) VALUES (?,?,?,?,?)',
      [userId, title, message || null, type, link]
    );
  } catch (e) { /* abaikan */ }
}

// Notifikasi untuk semua admin (persetujuan, dsb.)
async function notifyAdmins(exceptUserId, payload) {
  try {
    const [admins] = await db.query("SELECT id FROM users WHERE role='admin'");
    for (const a of admins) {
      if (exceptUserId && String(a.id) === String(exceptUserId)) continue;
      await notifyUser(a.id, payload);
    }
  } catch (e) { /* abaikan */ }
}

module.exports = { notifyUser, notifyAdmins };
