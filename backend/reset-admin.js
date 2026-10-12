const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function main() {
  const email = process.argv[2] || 'admin@alirsyad.sch.id';
  const password = process.argv[3] || 'admin123';
  const hash = await bcrypt.hash(password, 10);
  const [rows] = await db.query('SELECT id FROM users WHERE email=?', [email]);
  if (rows.length) {
    await db.query('UPDATE users SET password=? WHERE email=?', [hash, email]);
    console.log(`Password user ${email} berhasil direset ke: ${password}`);
  } else {
    await db.query("INSERT INTO users (name,email,password,role) VALUES ('Administrator',?,?,'admin')", [email, hash]);
    console.log(`User admin ${email} berhasil dibuat dengan password: ${password}`);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
