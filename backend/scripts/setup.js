/**
 * EduHub database setup + seed script.
 *
 * Responsibilities:
 *   1. Drop & recreate the database (clean reset).
 *   2. Apply database/schema.sql (creates database + all tables).
 *   3. Seed categories from database/seed.sql.
 *   4. Create the admin user from the ADMIN_EMAIL / ADMIN_PASSWORD
 *      environment variables, hashing the password with bcrypt at runtime.
 *
 * Run:  npm run db:setup
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'eduhub';

const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true, // allow multi-statement SQL files
};

async function run() {
  const root = path.join(__dirname, '..', '..');
  const schemaPath = path.join(root, 'database', 'schema.sql');
  const seedPath = path.join(root, 'database', 'seed.sql');

  let conn;
  try {
    conn = await mysql.createConnection(connectionConfig);
    console.log('Connected to MySQL.');

    // 1. Drop & recreate the database cleanly
    await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
    console.log(`[1/4] Dropped old "${DB_NAME}" database.`);

    // 2. Apply full schema (CREATE DATABASE + tables)
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await conn.query(schemaSql);
    console.log('[2/4] Database + tables created.');

    // 3. Seed categories
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await conn.query(seedSql);
    console.log('[3/4] Categories seeded.');

    // 4. Create / reset admin user from env vars (never hardcoded)
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@eduhub.local').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Admin';

    if (!adminPassword || adminPassword.length < 6) {
      throw new Error(
        'ADMIN_PASSWORD env var is missing or too short. ' +
        'Set ADMIN_PASSWORD in backend/.env before running setup.'
      );
    }
    if (adminPassword.includes('change-this')) {
      console.warn(
        'WARNING: ADMIN_PASSWORD still uses a placeholder. ' +
        'Change it in backend/.env before deploying.'
      );
    }

    const hash = await bcrypt.hash(adminPassword, 10);
    await conn.query(
      `INSERT INTO \`${DB_NAME}\`.\`users\` (name, email, password_hash, role)
       VALUES (?, ?, ?, 'admin')
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password_hash = VALUES(password_hash),
         role = 'admin'`,
      [adminName, adminEmail, hash]
    );
    console.log(`[4/4] Admin user ready (${adminEmail}).`);

    console.log('\nSetup complete. ✅');
  } catch (err) {
    console.error('Setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

run();
