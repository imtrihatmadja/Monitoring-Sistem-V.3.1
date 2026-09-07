-- =========================================================================
-- DFW INDONESIA MONEV & AWAK KAPAL - SKRIP UPDATE SKEMA SUPABASE (LFA)
-- =========================================================================
-- Tujuan:
-- 1. Menyediakan tabel standar `project_logframes` untuk Logical Framework.
-- 2. Menghindari konflik dengan data lama (backward compatible).
-- 3. Memastikan semua field LFA (Outcome, Output, Kegiatan, Indikator, Target,
--    Capaian, Variance, Progress, Tantangan, Pembelajaran, Rekomendasi)
--    tersimpan secara permanen di Supabase dan tersinkronisasi dengan modul lain.
--
-- Petunjuk Menjalankan:
-- 1. Salin seluruh isi skrip ini.
-- 2. Buka Supabase Dashboard Anda (https://supabase.com/dashboard)
-- 3. Pilih Proyek Anda -> Masuk ke menu 'SQL Editor' di sidebar kiri.
-- 4. Klik 'New query', tempel (paste) skrip ini, lalu klik 'Run'.
-- =========================================================================

DO $$
BEGIN
    RAISE NOTICE 'Memulai pembaruan skema SQL untuk Logical Framework DFW Indonesia...';

    -- =====================================================================
    -- 1. TABEL UTAMA STANDAR: project_logframes
    -- =====================================================================
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_logframes') THEN
        CREATE TABLE public.project_logframes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
            project_name TEXT DEFAULT 'DFW Indonesia',
            outcome TEXT,
            output TEXT,
            activities TEXT,
            activity_id UUID,
            indicator TEXT,
            indicator_id UUID,
            target TEXT,
            achievement TEXT,
            variance TEXT,
            progress TEXT,
            tantangan TEXT,
            pembelajaran TEXT,
            recommendation_activities TEXT,
            row_order INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );
        RAISE NOTICE 'Tabel project_logframes berhasil dibuat.';
    ELSE
        RAISE NOTICE 'Tabel project_logframes sudah ada. Melakukan pengecekan kelengkapan kolom...';
    END IF;

    -- Pastikan seluruh kolom pada project_logframes ada jika tabel sudah dibuat sebelumnya
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_logframes') THEN
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT 'DFW Indonesia';
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS outcome TEXT;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS output TEXT;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS activities TEXT;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS activity_id UUID;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS indicator TEXT;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS indicator_id UUID;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS target TEXT;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS achievement TEXT;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS variance TEXT;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS progress TEXT;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS tantangan TEXT;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS pembelajaran TEXT;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS recommendation_activities TEXT;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS row_order INTEGER DEFAULT 0;
        ALTER TABLE public.project_logframes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;

    -- =====================================================================
    -- 2. DUKUNGAN SNAPSHOT LFA PADA TABEL projects
    -- =====================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
        ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS logframe JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
        RAISE NOTICE 'Kolom logframe (JSONB) berhasil diverifikasi/ditambahkan ke tabel projects.';
    END IF;

    -- =====================================================================
    -- 3. PERBAIKAN & SINKRONISASI KOLOM PADA TABEL project_activities
    -- =====================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_activities') THEN
        ALTER TABLE public.project_activities ADD COLUMN IF NOT EXISTS tantangan TEXT;
        ALTER TABLE public.project_activities ADD COLUMN IF NOT EXISTS pembelajaran TEXT;
        ALTER TABLE public.project_activities ADD COLUMN IF NOT EXISTS challenges TEXT;
        ALTER TABLE public.project_activities ADD COLUMN IF NOT EXISTS lessons_learned TEXT;
        ALTER TABLE public.project_activities ADD COLUMN IF NOT EXISTS recommendation_activities TEXT;
        ALTER TABLE public.project_activities ADD COLUMN IF NOT EXISTS output TEXT;
        ALTER TABLE public.project_activities ADD COLUMN IF NOT EXISTS outcome TEXT;
        ALTER TABLE public.project_activities ADD COLUMN IF NOT EXISTS target TEXT;
        ALTER TABLE public.project_activities ADD COLUMN IF NOT EXISTS achievement TEXT;
        ALTER TABLE public.project_activities ADD COLUMN IF NOT EXISTS variance TEXT;
        ALTER TABLE public.project_activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
        RAISE NOTICE 'Kolom sinkronisasi berhasil diverifikasi/ditambahkan ke tabel project_activities.';
    END IF;

    -- =====================================================================
    -- 4. PERBAIKAN & SINKRONISASI KOLOM PADA TABEL project_indicators
    -- =====================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_indicators') THEN
        ALTER TABLE public.project_indicators ADD COLUMN IF NOT EXISTS outcome TEXT;
        ALTER TABLE public.project_indicators ADD COLUMN IF NOT EXISTS output TEXT;
        ALTER TABLE public.project_indicators ADD COLUMN IF NOT EXISTS tantangan TEXT;
        ALTER TABLE public.project_indicators ADD COLUMN IF NOT EXISTS pembelajaran TEXT;
        ALTER TABLE public.project_indicators ADD COLUMN IF NOT EXISTS indicator_name TEXT;
        ALTER TABLE public.project_indicators ADD COLUMN IF NOT EXISTS actual NUMERIC DEFAULT 0;
        ALTER TABLE public.project_indicators ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
        RAISE NOTICE 'Kolom sinkronisasi berhasil diverifikasi/ditambahkan ke tabel project_indicators.';
    END IF;

    -- =====================================================================
    -- 5. PERBAIKAN & SINKRONISASI KOLOM PADA TABEL project_outcomes
    -- =====================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_outcomes') THEN
        ALTER TABLE public.project_outcomes ADD COLUMN IF NOT EXISTS outcome_text TEXT;
        ALTER TABLE public.project_outcomes ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.project_outcomes ADD COLUMN IF NOT EXISTS output TEXT;
        ALTER TABLE public.project_outcomes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
        RAISE NOTICE 'Kolom sinkronisasi berhasil diverifikasi/ditambahkan ke tabel project_outcomes.';
    END IF;

    -- =====================================================================
    -- 6. PERBAIKAN & SINKRONISASI KOLOM PADA TABEL project_reflections
    -- =====================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_reflections') THEN
        ALTER TABLE public.project_reflections ADD COLUMN IF NOT EXISTS reflection_date TEXT;
        ALTER TABLE public.project_reflections ADD COLUMN IF NOT EXISTS lesson_learned TEXT;
        ALTER TABLE public.project_reflections ADD COLUMN IF NOT EXISTS created_by TEXT;
        ALTER TABLE public.project_reflections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
        RAISE NOTICE 'Kolom sinkronisasi berhasil diverifikasi/ditambahkan ke tabel project_reflections.';
    END IF;

    -- =====================================================================
    -- 7. PENGATURAN PERMISI DAN KEAMANAN RLS
    -- =====================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_logframes') THEN
        ALTER TABLE public.project_logframes DISABLE ROW LEVEL SECURITY;
        GRANT ALL ON TABLE public.project_logframes TO anon, authenticated, service_role;
        RAISE NOTICE 'Hak akses dan disable RLS untuk project_logframes berhasil diterapkan.';
    END IF;

    -- =====================================================================
    -- 8. INDEKS PERFORMA QUERY
    -- =====================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_logframes') THEN
        CREATE INDEX IF NOT EXISTS idx_project_logframes_project_id ON public.project_logframes (project_id);
        CREATE INDEX IF NOT EXISTS idx_project_logframes_row_order ON public.project_logframes (row_order);
        RAISE NOTICE 'Indeks performa untuk project_logframes berhasil dibuat/diverifikasi.';
    END IF;

    RAISE NOTICE 'Pembaruan skema SQL Logical Framework DFW Indonesia selesai dengan sukses!';
END $$;
