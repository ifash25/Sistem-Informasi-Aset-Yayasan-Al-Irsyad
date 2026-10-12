-- Kategori punya unit: NULL = global (semua unit), terisi = milik unit tertentu
-- (untuk DB lama yang sudah punya unique key 'code' global)
USE aset_alirsyad;

-- Drop unique global lama jika ada (kode boleh sama antar unit)
SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema='aset_alirsyad' AND table_name='categories' AND index_name='code');
SET @sql := IF(@idx > 0, 'ALTER TABLE categories DROP INDEX code', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Kolom unit_id (jika belum ada)
SET @col := (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema='aset_alirsyad' AND table_name='categories' AND column_name='unit_id');
SET @sql := IF(@col = 0,
  'ALTER TABLE categories ADD COLUMN unit_id INT NULL AFTER code',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- FK unit (jika belum ada)
SET @fk := (SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE table_schema='aset_alirsyad' AND table_name='categories'
    AND constraint_name='fk_categories_unit');
SET @sql := IF(@fk = 0,
  'ALTER TABLE categories ADD CONSTRAINT fk_categories_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Kode unik per lingkup (global atau per unit) — NULL dianggap satu kelompok
ALTER TABLE categories ADD UNIQUE KEY uq_code_unit (code, unit_id);
