const jwt = require('jsonwebtoken');
require('dotenv').config();

const FALLBACK_SECRET = 'eduhub_super_secret_change_me';
const SECRET = process.env.JWT_SECRET || FALLBACK_SECRET;

if (SECRET === FALLBACK_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET must be set to a strong random value in production. Refusing to start with a known default secret.'
    );
  }
  console.warn('[jwt] Using the built-in default JWT secret. Set JWT_SECRET for any real deployment.');
}

const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
