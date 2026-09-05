const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const pool = require('./db');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// ---- Middleware ----
app.disable('x-powered-by');

// CORS: allow the frontend origin
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, mobile) and the configured client origin
    const allowed = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
    if (!origin || origin === allowed || allowed.split(',').includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Security headers for all responses (API + uploaded files)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting: protect the whole API from abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // 600 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// Stricter rate limit on auth endpoints to slow brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth', authLimiter);

// ---- Static files (uploads) ----
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// ---- Health check ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---- Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/admin', adminRoutes);

// ---- 404 for unknown API routes ----
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ---- Central error handler ----
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Multer file-size errors
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large. Maximum allowed size is 50MB.' });
  }
  // Multer generic errors
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  // CORS errors
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed.' });
  }
  // JSON parse errors
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body.' });
  }

  const status = err.status || 500;
  if (status >= 500 && process.env.NODE_ENV === 'production') {
    return res.status(status).json({ error: 'Internal server error.' });
  }
  res.status(status).json({ error: err.message || 'Internal server error.' });
});

// ---- Start server ----
async function start() {
  try {
    // Verify DB connectivity
    await pool.query('SELECT 1');
    console.log('MySQL connected.');
  } catch (e) {
    console.error('Could not connect to MySQL. Is the server running and is the DB created?');
    console.error(e.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`EduHub API listening on http://localhost:${PORT}`);
  });
}

start();

module.exports = app;
