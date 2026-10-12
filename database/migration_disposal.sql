-- Modul penghapusan aset
USE aset_alirsyad;

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
