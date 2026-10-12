-- Fitur lanjutan: stock opname, penyusutan, notifikasi, audit trail
USE aset_alirsyad;

-- Notifikasi per user
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NULL,
  type VARCHAR(30) DEFAULT 'info', -- info|approval|opname|system
  link VARCHAR(150) NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read)
);

-- Audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  user_name VARCHAR(100) NULL,
  user_role VARCHAR(20) NULL,
  action VARCHAR(50) NOT NULL,      -- create/update/delete/approve/reject/login/finish...
  entity VARCHAR(50) NOT NULL,      -- asset/mutation/disposal/procurement/user/category...
  entity_id INT NULL,
  detail TEXT NULL,                 -- JSON snapshot / keterangan
  ip VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Kebijakan penyusutan per kategori (default garis lurus)
CREATE TABLE IF NOT EXISTS depreciation_policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL UNIQUE,
  method ENUM('garis_lurus','tanpa_susut') DEFAULT 'garis_lurus',
  useful_life_years INT NOT NULL DEFAULT 5,
  residual_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  updated_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Stock opname (periode penghitungan fisik per unit)
CREATE TABLE IF NOT EXISTS stock_opnames (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  opname_date DATE NOT NULL,
  notes TEXT NULL,
  status ENUM('draft','selesai') DEFAULT 'draft',
  total_assets INT DEFAULT 0,       -- snapshot jumlah aset unit saat selesai
  total_counted INT DEFAULT 0,
  total_missing INT DEFAULT 0,
  created_by INT NULL,
  finished_by INT NULL,
  finished_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES units(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (finished_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stock_opname_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  opname_id INT NOT NULL,
  asset_id INT NULL,
  asset_code VARCHAR(50) NULL,      -- diisi juga agar riwayat tetap terbaca
  asset_name VARCHAR(150) NULL,
  result ENUM('ada','hilang','rusak_ringan','rusak_berat','tidak_dikenal') NOT NULL DEFAULT 'ada',
  notes VARCHAR(255) NULL,
  counted_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opname_id) REFERENCES stock_opnames(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
  FOREIGN KEY (counted_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_opname_asset (opname_id, asset_id)
);

-- Kebijakan default untuk kategori global yang sudah ada
INSERT INTO depreciation_policies (category_id, method, useful_life_years, residual_percent)
SELECT id,
  CASE WHEN code='ATK' THEN 'tanpa_susut' ELSE 'garis_lurus' END,
  CASE code
    WHEN 'ELK' THEN 5 WHEN 'FRN' THEN 10 WHEN 'KDR' THEN 5
    WHEN 'BGN' THEN 20 WHEN 'ATK' THEN 1 WHEN 'LAB' THEN 5 WHEN 'ORG' THEN 5 ELSE 5 END,
  0
FROM categories WHERE unit_id IS NULL
  AND id NOT IN (SELECT category_id FROM depreciation_policies);
