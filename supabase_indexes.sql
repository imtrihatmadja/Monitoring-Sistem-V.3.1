-- ==========================================
-- DFW INDONESIA MONEV TOOLS - SUPABASE INDEXING SCRIPT
-- ==========================================
-- Script ini mendeteksi keberadaan tabel dan kolom secara dinamis sebelum membuat indeks.
-- Membatasi pencarian skema pada 'public' untuk mencegah kesalahan pencocokan silang (cross-schema)
-- dan memastikan kolom 'activity_id' dibuat di tabel 'issues' jika belum ada.
--
-- Petunjuk Penggunaan:
-- 1. Salin seluruh isi skrip ini.
-- 2. Buka Supabase Dashboard Anda (https://supabase.com).
-- 3. Pilih proyek DFW Indonesia Anda.
-- 4. Masuk ke menu 'SQL Editor' di sebelah kiri.
-- 5. Buat query baru, tempel skrip ini, lalu klik 'Run'.

DO $$
BEGIN
    RAISE NOTICE 'Memulai pembuatan indeks dinamis untuk DFW Indonesia Monev Tools...';

    -- =========================================================================
    -- PERBAIKAN: Pastikan kolom 'activity_id' ada di tabel 'issues'
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'issues') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'issues' AND column_name = 'activity_id') THEN
            ALTER TABLE public.issues ADD COLUMN activity_id UUID;
            RAISE NOTICE 'Kolom activity_id berhasil ditambahkan ke tabel issues.';
        END IF;
    END IF;

    -- =========================================================================
    -- TABEL: projects
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'status') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects (status);';
        RAISE NOTICE 'Indeks idx_projects_status berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'is_archived') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_projects_is_archived ON public.projects (is_archived);';
        RAISE NOTICE 'Indeks idx_projects_is_archived berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'created_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects (created_at);';
        RAISE NOTICE 'Indeks idx_projects_created_at berhasil diverifikasi/dibuat.';
    END IF;

    -- =========================================================================
    -- TABEL: project_indicators
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_indicators' AND column_name = 'project_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_indicators_project_id ON public.project_indicators (project_id);';
        RAISE NOTICE 'Indeks idx_project_indicators_project_id berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_indicators' AND column_name = 'sort_order') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_indicators_sort_order ON public.project_indicators (sort_order);';
        RAISE NOTICE 'Indeks idx_project_indicators_sort_order berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_indicators' AND column_name = 'created_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_indicators_created_at ON public.project_indicators (created_at);';
        RAISE NOTICE 'Indeks idx_project_indicators_created_at berhasil diverifikasi/dibuat.';
    END IF;

    -- =========================================================================
    -- TABEL: project_outcomes
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_outcomes' AND column_name = 'project_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_outcomes_project_id ON public.project_outcomes (project_id);';
        RAISE NOTICE 'Indeks idx_project_outcomes_project_id berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_outcomes' AND column_name = 'sort_order') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_outcomes_sort_order ON public.project_outcomes (sort_order);';
        RAISE NOTICE 'Indeks idx_project_outcomes_sort_order berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_outcomes' AND column_name = 'created_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_outcomes_created_at ON public.project_outcomes (created_at);';
        RAISE NOTICE 'Indeks idx_project_outcomes_created_at berhasil diverifikasi/dibuat.';
    END IF;

    -- =========================================================================
    -- TABEL: project_activities
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_activities' AND column_name = 'project_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_activities_project_id ON public.project_activities (project_id);';
        RAISE NOTICE 'Indeks idx_project_activities_project_id berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_activities' AND column_name = 'status') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_activities_status ON public.project_activities (status);';
        RAISE NOTICE 'Indeks idx_project_activities_status berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_activities' AND column_name = 'created_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_activities_created_at ON public.project_activities (created_at);';
        RAISE NOTICE 'Indeks idx_project_activities_created_at berhasil diverifikasi/dibuat.';
    END IF;

    -- =========================================================================
    -- TABEL: project_sub_activities
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_sub_activities' AND column_name = 'parent_activity_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_sub_activities_parent_id ON public.project_sub_activities (parent_activity_id);';
        RAISE NOTICE 'Indeks idx_project_sub_activities_parent_id berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_sub_activities' AND column_name = 'status') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_sub_activities_status ON public.project_sub_activities (status);';
        RAISE NOTICE 'Indeks idx_project_sub_activities_status berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_sub_activities' AND column_name = 'created_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_sub_activities_created_at ON public.project_sub_activities (created_at);';
        RAISE NOTICE 'Indeks idx_project_sub_activities_created_at berhasil diverifikasi/dibuat.';
    END IF;

    -- =========================================================================
    -- TABEL: beneficiaries
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beneficiaries' AND column_name = 'gender') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_beneficiaries_gender ON public.beneficiaries (gender);';
        RAISE NOTICE 'Indeks idx_beneficiaries_gender berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beneficiaries' AND column_name = 'created_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_beneficiaries_created_at ON public.beneficiaries (created_at);';
        RAISE NOTICE 'Indeks idx_beneficiaries_created_at berhasil diverifikasi/dibuat.';
    END IF;

    -- =========================================================================
    -- TABEL: issues
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'issues' AND column_name = 'project_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_issues_project_id ON public.issues (project_id);';
        RAISE NOTICE 'Indeks idx_issues_project_id berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'issues' AND column_name = 'activity_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_issues_activity_id ON public.issues (activity_id);';
        RAISE NOTICE 'Indeks idx_issues_activity_id berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'issues' AND column_name = 'status') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues (status);';
        RAISE NOTICE 'Indeks idx_issues_status berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'issues' AND column_name = 'created_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_issues_created_at ON public.issues (created_at);';
        RAISE NOTICE 'Indeks idx_issues_created_at berhasil diverifikasi/dibuat.';
    END IF;

    -- =========================================================================
    -- TABEL: staff
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'status') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff (status);';
        RAISE NOTICE 'Indeks idx_staff_status berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'created_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_staff_created_at ON public.staff (created_at);';
        RAISE NOTICE 'Indeks idx_staff_created_at berhasil diverifikasi/dibuat.';
    END IF;

    -- =========================================================================
    -- TABEL: project_reflections
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_reflections' AND column_name = 'project_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_reflections_project_id ON public.project_reflections (project_id);';
        RAISE NOTICE 'Indeks idx_project_reflections_project_id berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_reflections' AND column_name = 'type') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_reflections_type ON public.project_reflections (type);';
        RAISE NOTICE 'Indeks idx_project_reflections_type berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_reflections' AND column_name = 'created_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_reflections_created_at ON public.project_reflections (created_at);';
        RAISE NOTICE 'Indeks idx_project_reflections_created_at berhasil diverifikasi/dibuat.';
    END IF;

    -- =========================================================================
    -- TABEL: project_documents
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_documents' AND column_name = 'category') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_documents_category ON public.project_documents (category);';
        RAISE NOTICE 'Indeks idx_project_documents_category berhasil diverifikasi/dibuat.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_documents' AND column_name = 'created_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_project_documents_created_at ON public.project_documents (created_at);';
        RAISE NOTICE 'Indeks idx_project_documents_created_at berhasil diverifikasi/dibuat.';
    END IF;

    RAISE NOTICE 'Semua indeks diproses dan diverifikasi dengan sukses!';
END $$;
