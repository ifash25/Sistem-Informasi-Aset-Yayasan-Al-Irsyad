const db = require('../config/db');

// Catat audit trail; jangan pernah throw (audit gagal tidak boleh gagalkan transaksi utama)
async function logAudit(req, action, entity, entityId, detail) {
  try {
    const u = req.user || {};
    const d = typeof detail === 'string' ? detail : JSON.stringify(detail ?? null);
    await db.query(
      'INSERT INTO audit_logs (user_id,user_name,user_role,action,entity,entity_id,detail,ip) VALUES (?,?,?,?,?,?,?,?)',
      [u.id || null, u.name || null, u.role || null, action, String(entity), entityId || null, d, req.ip || null]
    );
  } catch (e) { /* abaikan */ }
}

module.exports = { logAudit };
