const bcrypt = require('bcryptjs');
const db = require('./config/db');

// node seed-operators.js [password]
// Membuat operator BPP, RQ, SD, SMP, SMK
async function main() {
  const password = process.argv[2] || 'operator123';
  const hash = await bcrypt.hash(password, 10);
  const defs = [
    ['Operator BPP', 'bpp@alirsyad.sch.id', 'BPP'],
    ['Operator RQ', 'rq@alirsyad.sch.id', 'RQ'],
    ['Operator SD', 'sd@alirsyad.sch.id', 'SD'],
    ['Operator SMP', 'smp@alirsyad.sch.id', 'SMP'],
    ['Operator SMK', 'smk@alirsyad.sch.id', 'SMK'],
  ];
  for (const [name, email, code] of defs) {
    const [[unit]] = await db.query('SELECT id FROM units WHERE code=?', [code]);
    if (!unit) { console.log(`Unit ${code} tidak ditemukan, lewati`); continue; }
    const [rows] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (rows.length) {
      await db.query('UPDATE users SET name=?, password=?, role=?, unit_id=? WHERE email=?', [name, hash, 'operator', unit.id, email]);
      console.log(`Update ${email} -> unit ${code}`);
    } else {
      await db.query('INSERT INTO users (name,email,password,role,unit_id) VALUES (?,?,?,?,?)', [name, email, hash, 'operator', unit.id]);
      console.log(`Buat ${email} -> unit ${code}`);
    }
  }
  console.log(`Password semua operator: ${password}`);
  process.exit(0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
