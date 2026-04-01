const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-change-me';

function parseCookieValue(cookieHeader, name) {
  if (!cookieHeader) return '';
  const parts = String(cookieHeader).split(';').map((p) => p.trim());
  const prefix = `${name}=`;
  const found = parts.find((p) => p.startsWith(prefix));
  if (!found) return '';
  return decodeURIComponent(found.slice(prefix.length));
}

function getBearerToken(req) {
  const auth = req.headers && req.headers.authorization;
  if (!auth || typeof auth !== 'string') return '';
  if (!auth.toLowerCase().startsWith('bearer ')) return '';
  return auth.slice(7).trim();
}

function getAdminPayload(req) {
  if (req.session && req.session.admin) {
    return {
      admin: true,
      adminId: req.session.adminId || null,
      username: req.session.username || 'Admin'
    };
  }

  const bearerToken = getBearerToken(req);
  const cookieToken = parseCookieValue(req.headers && req.headers.cookie, 'admin_token');
  const token = bearerToken || cookieToken;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.admin) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const payload = getAdminPayload(req);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.admin = payload;
  return next();
}

function createAdminToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = {
  requireAdmin,
  getAdminPayload,
  createAdminToken
};
