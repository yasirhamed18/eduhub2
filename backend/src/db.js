const mysql = require('mysql2/promise');
require('dotenv').config();

// Aiven (and most hosted MySQL providers) require SSL. mysql2 can't parse
// "?ssl-mode=REQUIRED" from inside a connection URI, so we strip any query
// string from DATABASE_URL and pass ssl as its own explicit option instead.
const rawUrl = process.env.DATABASE_URL || '';
const needsSSL =
  String(process.env.DB_SSL || '').toLowerCase() === 'true' ||
  rawUrl.includes('aivencloud.com');

const baseConfig = rawUrl
  ? { uri: rawUrl.replace(/\?.*$/, '') }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'eduhub',
    };

const pool = mysql.createPool({
  ...baseConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  dateStrings: true,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
});

module.exports = pool;
