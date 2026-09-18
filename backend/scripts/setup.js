/**
 * EduHub database setup + seed script.
 *
 * Works with hosts (like Clever Cloud, Aiven, PlanetScale) where the
 * database user does NOT have permission to CREATE/DROP databases and
 * can only work inside the one database they were given. It connects
 * directly to DB_NAME, strips any DROP/CREATE DATABASE or USE
 * statements out of the SQL files, and just creates tables inside
 * whatever database is already there.
 *
 * Run:  npm run db:setup
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'eduhub';

const needsSSL =
  String(process.env.DB_SSL || '').toLowerCase() === 'true' ||
  String(process.env.DB_HOST || '').includes('aivencloud.com');

const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME, // connect straight into the existing database
  multipleStatements: true,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
};

// Remove statements that need database-creation privileges the
// managed-hosting user doesn't have, and any hardcoded "USE eduhub;".
function stripDatabaseStatements(sql) {
  return sql
    .replace(/DROP\s+DATABASE[^;]*;/gi, '')
    .replace(/CREATE\s+DATABASE[^;]*;/gi, '')
    .replace(/USE\s+[`'"]?\w+[`'"]?\s*;/gi, '');
}

async function run() {
  const root = path.join(__dirname, '..', '..');
  const schemaPath = path.join(root, 'database', 'schema.sql');
  const seedPath = path.join(root, 'database', 'seed.sql');

  let conn;
  try {
    conn = await mysql.createConnection(connectionConfig);
    console.log(`Connected to MySQL database "${DB_NAME}".`);

    // 1. Create tables inside the existing database (no DROP/CREATE DATABASE)
    const schemaSql = stripDatabaseStatements(fs.readFileSync(schemaPath, 'utf8'));
    await conn.query(schemaSql);
    console.log('[1/3] Tables created (or already existed).');

    // 2. Seed categories
    const seedSql = stripDatabaseStatements(fs.readFileSync(seedPath, 'utf8'));
    await conn.query(seedSql);
    console.log('[2/3] Categories seeded.');

    // 3. Create / reset admin user from env vars (never hardcoded)
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@eduhub.local').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Admin';

    if (!adminPassword || adminPassword.length < 6) {
      throw new Error(
        'ADMIN_PASSWORD env var is missing or too short. ' +
        'Set ADMIN_PASSWORD in your environment before running setup.'
      );
    }

    const hash = await bcrypt.hash(adminPassword, 10);
    await conn.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, 'admin')
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password_hash = VALUES(password_hash),
         role = 'admin'`,
      [adminName, adminEmail, hash]
    );
    console.log(`[3/3] Admin user ready (${adminEmail}).`);

    console.log('\nSetup complete. ✅');
  } catch (err) {
    console.error('Setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

run();
