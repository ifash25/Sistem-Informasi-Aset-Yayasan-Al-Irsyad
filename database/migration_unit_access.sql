-- Migrasi: hak akses per unit + approval mutasi
-- Jalankan di HeidiSQL / phpMyAdmin pada database aset_alirsyad
USE aset_alirsyad;

-- Tambah kolom status approval mutasi (abaikan error jika sudah ada)
ALTER TABLE mutations ADD COLUMN status ENUM('pending','approved','rejected') DEFAULT 'approved';
ALTER TABLE mutations ADD COLUMN approved_by INT NULL;
ALTER TABLE mutations ADD COLUMN approved_at TIMESTAMP NULL;
ALTER TABLE mutations ADD CONSTRAINT fk_mutations_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Pastikan role users lengkap
ALTER TABLE users MODIFY role ENUM('admin','operator','viewer') DEFAULT 'operator';

-- Contoh: buat operator tiap unit (ganti password via backend/reset-admin.js)
-- INSERT INTO users (name,email,password,role,unit_id) VALUES
-- ('Operator BPP','bpp@alirsyad.sch.id','HASH','operator',(SELECT id FROM units WHERE code='BPP')),
-- ('Operator RQ','rq@alirsyad.sch.id','HASH','operator',(SELECT id FROM units WHERE code='RQ')),
-- ('Operator SD','sd@alirsyad.sch.id','HASH','operator',(SELECT id FROM units WHERE code='SD')),
-- ('Operator SMP','smp@alirsyad.sch.id','HASH','operator',(SELECT id FROM units WHERE code='SMP')),
-- ('Operator SMK','smk@alirsyad.sch.id','HASH','operator',(SELECT id FROM units WHERE code='SMK'));
