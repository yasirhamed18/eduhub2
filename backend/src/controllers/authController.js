const bcrypt = require('bcryptjs');
const pool = require('../db');
const { signToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;

function sanitizeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
  };
}

// GET /api/auth/me
async function me(req, res) {
  if (!req.user) {
    return res.json({ user: null });
  }
  const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) {
    return res.json({ user: null });
  }
  return res.json({ user: sanitizeUser(rows[0]) });
}

// POST /api/auth/register
async function register(req, res) {
  const { name, email, password } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Please provide your name.' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const cleanName = String(name).trim().slice(0, 100);
  const cleanEmail = String(email).trim().toLowerCase();

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (existing.length) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const hash = await bcrypt.hash(String(password), SALT_ROUNDS);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [cleanName, cleanEmail, hash, 'user']
  );

  const token = signToken({ id: result.insertId, name: cleanName, email: cleanEmail, role: 'user' });
  return res.status(201).json({ token, user: { id: result.insertId, name: cleanName, email: cleanEmail, role: 'user' } });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide your email and password.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);

  if (!rows.length) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const user = rows[0];
  const ok = await bcrypt.compare(String(password), user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role });
  return res.json({ token, user: sanitizeUser(user) });
}

// POST /api/auth/change-password  (authenticated user changes their own password)
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Please provide your current and new password.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const [rows] = await pool.query('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const ok = await bcrypt.compare(String(currentPassword), rows[0].password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const hash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
  return res.json({ success: true });
}

module.exports = { me, register, login, changePassword };
