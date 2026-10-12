# Sistem Informasi Aset Yayasan Al-Irsyad

Aplikasi pendataan & pengelolaan aset untuk unit: **BPP, RQ, SD, SMP, SMK**.

Stack: **React + Vite (frontend) + Node.js Express (backend) + MySQL (database)**

## Struktur Folder

```
E:\mine\app
├── backend/           # API Express
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── routes/*.js
│   ├── uploads/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/          # React + Vite
│   ├── src/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── database/schema.sql
└── README.md
```

## 1. Setup Database

1. Buat database MySQL:
```sql
CREATE DATABASE aset_alirsyad CHARACTER SET utf8mb4;
```
2. Import `database/schema.sql`:
```
mysql -u root -p aset_alirsyad < database/schema.sql
```
Default login: `admin@alirsyad.sch.id` / `admin123`

## 2. Setup Backend

```
cd backend
npm install
cp .env.example .env
# edit .env sesuaikan DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET
npm run dev
```
API jalan di `http://localhost:5000`

## 3. Setup Frontend

```
cd frontend
npm install
npm run dev
```
Frontend jalan di `http://localhost:5173`

## Fitur
- Login JWT (admin, operator unit, viewer)
- Dashboard statistik per unit
- CRUD Aset + kode inventaris otomatis (ex: ALM/SD/2026/0001)
- Master Unit, Kategori, Lokasi
- Mutasi aset antar unit/lokasi + riwayat
- Pemeliharaan / servis
- Laporan + export CSV
- Upload foto aset
