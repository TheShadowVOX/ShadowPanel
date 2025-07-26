// scripts/sessions.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const table = process.env.SESSION_TABLE || 'shadow_sessions';

async function createSessionTable() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_IP,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DB,
  });

  const sql = `
    CREATE TABLE IF NOT EXISTS \`${table}\` (
      \`session_id\` varchar(128) COLLATE utf8mb4_bin NOT NULL,
      \`expires\` int(11) unsigned NOT NULL,
      \`data\` text COLLATE utf8mb4_bin,
      PRIMARY KEY (\`session_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
  `;

  try {
    await connection.execute(sql);
    console.log(`[DB] Table ${table} created or already exists.`);
  } catch (err) {
    console.error('[DB] Error creating session table:', err);
  } finally {
    await connection.end();
  }
}

createSessionTable();
