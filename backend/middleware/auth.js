const jwt = require('jsonwebtoken');

function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      if (!required) return next();
      return res.status(401).json({ message: 'Token tidak ditemukan' });
    }
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'alirsyad_secret_2026');
      next();
    } catch (e) {
      return res.status(401).json({ message: 'Token tidak valid' });
    }
  };
}

function adminOnly(req, res, next) {
  if (req.user && (req.user.role === 'admin')) return next();
  return res.status(403).json({ message: 'Khusus admin' });
}

module.exports = { auth, adminOnly };
