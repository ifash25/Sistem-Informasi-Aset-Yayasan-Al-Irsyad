// node validate_tables.js - cek apakah semua tabel dari schema.sql sudah ada di DB
const fs = require('fs');
const mysql = require('mysql2/promise');
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'aset_alirsyad'
});
(async () => {
  const [rows] = await db.query(`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'aset_alirsyad' AND TABLE_TYPE = 'BASE TABLE'`);
  const dbTables = (rows || []).map(r => r.TABLE_NAME);
  fs.writeFileSync(__dirname + '/validate_tables_result.txt', dbTables.join('\n'));
  console.log('tables di DB: ' + dbTables.join(', '));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
