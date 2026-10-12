const express = require('express');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const router = express.Router();
router.use(auth());

router.get('/summary', async (req, res) => {
  try {
    const [[total]] = await db.query('SELECT COUNT(*) as total, COALESCE(SUM(purchase_price),0) as nilai FROM assets WHERE status != "dihapus"');
    const [perUnit] = await db.query(
      `SELECT u.code, u.name, COUNT(a.id) as jumlah, COALESCE(SUM(a.purchase_price),0) as nilai
       FROM units u LEFT JOIN assets a ON a.unit_id=u.id AND a.status != 'dihapus'
       GROUP BY u.id ORDER BY u.id`
    );
    const [perCond] = await db.query(
      'SELECT `condition`, COUNT(*) as jumlah FROM assets WHERE status != "dihapus" GROUP BY `condition`'
    );
    const [recent] = await db.query(
      `SELECT a.asset_code, a.name, u.code as unit_code, a.created_at
       FROM assets a JOIN units u ON u.id=a.unit_id ORDER BY a.created_at DESC LIMIT 8`
    );
    res.json({ total: total.total, nilai: total.nilai, perUnit, perCond, recent });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/report.csv', async (req, res) => {
  const { unit_id } = req.query;
  let sql = `SELECT a.asset_code, a.name, c.name as kategori, u.code as unit,
    l.name as lokasi, a.brand, a.purchase_year, a.purchase_price, a.\`condition\`, a.status
    FROM assets a JOIN categories c ON c.id=a.category_id
    JOIN units u ON u.id=a.unit_id LEFT JOIN locations l ON l.id=a.location_id WHERE 1=1`;
  const p = [];
  if (unit_id) { sql += ' AND a.unit_id=?'; p.push(unit_id); }
  const [rows] = await db.query(sql, p);
  const header = 'kode;nama;kategori;unit;lokasi;merk;tahun;harga;kondisi;status\n';
  const body = rows.map(r => [r.asset_code, r.name, r.kategori, r.unit, r.lokasi || '', r.brand || '', r.purchase_year || '', r.purchase_price, r.condition, r.status].join(';')).join('\n');
  res.header('Content-Type', 'text/csv');
  res.attachment('laporan-aset.csv');
  res.send(header + body);
});

module.exports = router;
