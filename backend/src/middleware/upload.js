const multer = require('multer');
const path = require('path');
require('dotenv').config();

const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES) || 50 * 1024 * 1024; // 50MB

// Web-executable file types could run in a browser if served back out.
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

// Files are kept in memory just long enough to be forwarded to Supabase
// Storage. Nothing is written to local disk, since that disk gets wiped
// on every restart/redeploy on hosts like Render.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
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

module.exports = { upload, MAX_FILE_BYTES };
