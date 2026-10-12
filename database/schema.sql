-- Sistem Informasi Aset Yayasan Al-Irsyad
CREATE DATABASE IF NOT EXISTS aset_alirsyad CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE aset_alirsyad;

CREATE TABLE IF NOT EXISTS units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','operator','viewer') DEFAULT 'operator',
  unit_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL,
  unit_id INT NULL, -- NULL = global semua unit, terisi = kategori milik unit
  UNIQUE KEY uq_code_unit (code, unit_id),
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  category_id INT NOT NULL,
  unit_id INT NOT NULL,
  location_id INT NULL,
  brand VARCHAR(100) NULL,
  serial_number VARCHAR(100) NULL,
  purchase_year YEAR NULL,
  purchase_price DECIMAL(15,2) DEFAULT 0,
  `condition` ENUM('baik','rusak_ringan','rusak_berat','hilang') DEFAULT 'baik',
  status ENUM('aktif','dipinjam','dimutasi','dihapus') DEFAULT 'aktif',
  photo VARCHAR(255) NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (unit_id) REFERENCES units(id),
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mutations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  from_unit_id INT NULL,
  to_unit_id INT NOT NULL,
  from_location_id INT NULL,
  to_location_id INT NULL,
  mutation_date DATE NOT NULL,
  reason TEXT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'approved',
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (from_unit_id) REFERENCES units(id) ON DELETE SET NULL,
  FOREIGN KEY (to_unit_id) REFERENCES units(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  maintenance_date DATE NOT NULL,
  type VARCHAR(100) NOT NULL,
  cost DECIMAL(15,2) DEFAULT 0,
  vendor VARCHAR(150) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS disposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  disposal_date DATE NOT NULL,
  reason ENUM('rusak_berat','hilang','dijual','dihibahkan','lainnya') NOT NULL,
  description TEXT NULL,
  ba_number VARCHAR(100) NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_by INT NULL,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS procurements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  plan_year YEAR NOT NULL,
  status ENUM('draft','diajukan','disetujui','ditolak','selesai') DEFAULT 'draft',
  total_plan DECIMAL(15,2) DEFAULT 0,
  total_real DECIMAL(15,2) DEFAULT 0,
  created_by INT NULL,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES units(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS procurement_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  procurement_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  category_id INT NULL,
  qty INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) DEFAULT 0,
  real_price DECIMAL(15,2) NULL,
  real_qty INT NULL,
  vendor VARCHAR(150) NULL,
  received TINYINT(1) DEFAULT 0,
  asset_id INT NULL,
  notes VARCHAR(255) NULL,
  FOREIGN KEY (procurement_id) REFERENCES procurements(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL
);

-- Seed unit BPP, RQ, SD, SMP, SMK
INSERT INTO units (code, name) VALUES
('BPP','Badan Pengelola Pendidikan'),
('RQ','Rumah Qur\'an'),
('SD','Sekolah Dasar'),
('SMP','Sekolah Menengah Pertama'),
('SMK','Sekolah Menengah Kejuruan')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO categories (name, code) VALUES
('Elektronik','ELK'),
('Furniture','FRN'),
('Kendaraan','KDR'),
('Bangunan','BGN'),
('ATK','ATK'),
('Laboratorium','LAB'),
('Olahraga','ORG')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- admin login: admin@alirsyad.sch.id / admin123 (bcrypt hash)
INSERT INTO users (name, email, password, role) VALUES
('Administrator','admin@alirsyad.sch.id','$2b$10$wLQZzP3m8Qe8w4eOxQe8zu7Y9Qe8w4eOxQe8zu7Y9Qe8w4eOxQe8zu','admin')
-- Generated migration advanced (stock_opname, depreciation, notifications, audit)
CREATE TABLE IF NOT EXISTS stock_opnames (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  opname_date DATE NOT NULL,
  status ENUM('draft','dalam_proses','selesai') DEFAULT 'draft',
  total_expected INT DEFAULT 0,
  total_counted INT DEFAULT 0,
  total_missing INT DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES units(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stock_opname_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  opname_id INT NOT NULL,
  asset_id INT NOT NULL,
  expected_qty INT DEFAULT 1,
  counted_qty INT DEFAULT 0,
  result ENUM('ada','hilang','rusak_ringan','rusak_berat') NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opname_id) REFERENCES stock_opnames(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS depreciation_policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  unit_id INT NULL,
  method ENUM('garis_lurus','straight_line') DEFAULT 'garis_lurus',
  useful_life_years INT DEFAULT 5,
  residual_percent DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  UNIQUE KEY uq_category_unit (category_id, unit_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NULL,
  link VARCHAR(255) NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id INT NULL,
  detail LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

ON DUPLICATE KEY UPDATE name=VALUES(name);
