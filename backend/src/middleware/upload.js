const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const UPLOAD_DIR = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES) || 50 * 1024 * 1024; // 50MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Sanitize the original filename and prefix with timestamp to avoid collisions
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`;
    cb(null, unique);
  },
});

// Web-executable file types are served from /uploads and could run in a browser.
// Block them so an uploaded file can never become a stored XSS / phishing vector.
const FORBIDDEN_EXTENSIONS = new Set([
  'html', 'htm', 'xhtml', 'svg', 'xml', 'js', 'mjs', 'cjs', 'php', 'asp',
  'aspx', 'sh', 'bat', 'cmd', 'jar', 'jsp', 'vbs', 'ps1',
]);
const FORBIDDEN_MIMES = new Set([
  'text/html', 'image/svg+xml', 'text/xml', 'application/xml',
  'application/xhtml+xml', 'application/javascript', 'text/javascript',
  'application/x-php', 'application/x-sh',
]);

function rejectedFileError() {
  const err = new Error('This file type is not allowed.');
  err.status = 400;
  return err;
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    // Reject empty-looking files
    if (!file || !file.originalname) {
      return cb(new Error('Invalid file.'));
    }
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    if (FORBIDDEN_EXTENSIONS.has(ext) || FORBIDDEN_MIMES.has(mime)) {
      return cb(rejectedFileError());
    }
    cb(null, true);
  },
});

module.exports = { upload, UPLOAD_DIR, MAX_FILE_BYTES };
