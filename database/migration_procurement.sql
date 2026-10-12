-- Modul pengadaan aset (rencana belanja + realisasi)
USE aset_alirsyad;

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
