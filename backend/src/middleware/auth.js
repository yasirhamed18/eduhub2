const { verifyToken } = require('../utils/jwt');

/**
 * Middleware: require a valid Bearer token.
 * Attaches req.user = { id, name, email, role }.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

/**
 * Middleware: optional authentication.
 * Populates req.user if a valid Bearer token is present; otherwise continues
 * without it. Useful for read endpoints that report "liked by me".
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      };
    } catch (err) {
      // invalid token -> treat as anonymous
    }
  }
  return next();
}

/**
 * Middleware: require the user to be an admin.
 * Must run AFTER requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  return next();
}

module.exports = { requireAuth, optionalAuth, requireAdmin };
