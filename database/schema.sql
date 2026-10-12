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
  code VARCHAR(10) NOT NULL UNIQUE
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
ON DUPLICATE KEY UPDATE name=VALUES(name);
