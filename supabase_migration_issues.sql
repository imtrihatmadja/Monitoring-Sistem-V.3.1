-- MIGRATION SCRIPT FOR SUPABASE DATABASE (DFW INDONESIA)
-- Script migrasi komprehensif untuk memperbaiki kegagalan impor CSV/Excel pada Supabase.
--
-- Petunjuk Penggunaan:
-- 1. Salin seluruh isi skrip ini.
-- 2. Buka Supabase Dashboard Anda (https://supabase.com).
-- 3. Pilih proyek DFW Indonesia Anda.
-- 4. Masuk ke menu 'SQL Editor' di sebelah kiri.
-- 5. Buat query baru, tempel skrip ini, lalu klik 'Run'.

-- KONFIGURASI FORMAT TANGGAL (PENTING AGAR IMPORT EXCEL/CSV HARI/BULAN/TAHUN TIDAK ERROR)
ALTER DATABASE postgres SET datestyle TO 'ISO, DMY';

-- ==========================================
-- 1. FIX TABLE: project_outcomes
-- ==========================================
-- Masalah: Kolom "outcome_text", "sort_order" tidak ditemukan, dan constraint NOT NULL pada "title" menggagalkan impor.
ALTER TABLE project_outcomes 
ADD COLUMN IF NOT EXISTS outcome_text TEXT;

ALTER TABLE project_outcomes 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE project_outcomes 
ALTER COLUMN title DROP NOT NULL;


-- ==========================================
-- 2. FIX TABLE: project_activities
-- ==========================================
-- Masalah: Kolom "project_name", "deadline", "challenges" tidak ditemukan.
ALTER TABLE project_activities 
ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT 'DFW Indonesia';

ALTER TABLE project_activities 
ADD COLUMN IF NOT EXISTS deadline TEXT;

ALTER TABLE project_activities 
ADD COLUMN IF NOT EXISTS challenges TEXT;


-- ==========================================
-- 3. FIX TABLE: project_indicators
-- ==========================================
-- Masalah: Kolom "indicator_name", "type", "actual", "sort_order" tidak ditemukan, dan constraint NOT NULL pada "title" menggagalkan impor.
ALTER TABLE project_indicators 
ADD COLUMN IF NOT EXISTS indicator_name TEXT;

ALTER TABLE project_indicators 
ADD COLUMN IF NOT EXISTS type TEXT;

ALTER TABLE project_indicators 
ADD COLUMN IF NOT EXISTS actual NUMERIC DEFAULT 0;

ALTER TABLE project_indicators 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE project_indicators 
ALTER COLUMN title DROP NOT NULL;


-- ==========================================
-- 4. FIX TABLE: project_reflections
-- ==========================================
-- Masalah: Kolom "project_name", "reflection_date", "lesson_learned", "created_by" tidak ditemukan, dan constraint NOT NULL pada "lesson" menggagalkan impor.
ALTER TABLE project_reflections 
ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT 'DFW Indonesia';

ALTER TABLE project_reflections 
ADD COLUMN IF NOT EXISTS reflection_date TEXT;

ALTER TABLE project_reflections 
ADD COLUMN IF NOT EXISTS lesson_learned TEXT;

ALTER TABLE project_reflections 
ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE project_reflections 
ALTER COLUMN lesson DROP NOT NULL;


-- ==========================================
-- 4.5. FIX TABLE: beneficiaries
-- ==========================================
-- Masalah: Kolom "notes" tidak ditemukan saat mengimpor CSV beneficiaries.
ALTER TABLE beneficiaries 
ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE beneficiaries 
ADD COLUMN IF NOT EXISTS notes TEXT;


-- ==========================================
-- 5. FIX TABLE: project_sub_activities (FOREIGN KEY CONSTRAINT & NOTES COLUMN)
-- ==========================================
-- Masalah: insert/update melanggar foreign key constraint "project_sub_activities_parent_activity_id_fkey", dan kolom "notes" untuk catatan perkembangan sub-aktivitas tidak ada.
-- Solusi: Kita buat relasi FK menjadi 'NOT VALID' dan tambahkan kolom notes bertipe JSONB.
ALTER TABLE project_sub_activities 
ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;

ALTER TABLE project_sub_activities 
DROP CONSTRAINT IF EXISTS project_sub_activities_parent_activity_id_fkey;

ALTER TABLE project_sub_activities 
ADD CONSTRAINT project_sub_activities_parent_activity_id_fkey 
FOREIGN KEY (parent_activity_id) REFERENCES project_activities(id) 
ON DELETE CASCADE NOT VALID;


-- ==========================================
-- 6. VERIFIKASI KOLOM (Kueri opsional untuk mengecek hasil)
-- ==========================================
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('project_outcomes', 'project_activities', 'project_indicators', 'project_reflections', 'project_sub_activities') 
ORDER BY table_name, column_name;
