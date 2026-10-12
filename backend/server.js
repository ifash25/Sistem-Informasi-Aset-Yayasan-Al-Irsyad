const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.json({ message: 'API Sistem Informasi Aset Yayasan Al-Irsyad' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/master', require('./routes/master'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/mutations', require('./routes/mutations'));
app.use('/api/dashboard', require('./routes/dashboard'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend jalan di http://localhost:${PORT}`));
