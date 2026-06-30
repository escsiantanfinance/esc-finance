-- ============================================================
-- ESC SIANTAN FINANCE - Supabase Database Schema v3.0
-- Sistem Akuntansi & Bendahara Gereja Terintegrasi (Multi-Kas)
-- ------------------------------------------------------------
-- Desain inti: double-entry ledger (akun + jurnal_umum) sebagai
-- satu sumber kebenaran. Persembahan & pengeluaran auto-posting
-- ke jurnal lewat trigger, sehingga 3 laporan keuangan
-- (Aktivitas / Neraca / Arus Kas) konsisten dari satu sumber.
--
-- BARU di v3.0:
--   • Kategori persembahan jadi TABEL (bukan ENUM) → bisa dicustom
--     Super Admin, tiap kategori menuju SATU kas tujuan.
--   • Multi-kas: tiap kas punya sub-akun aset sendiri + akses per
--     bendahara (kas_akses) yang diatur Super Admin.
--   • Sesi: nama custom + pengeluaran tunai "Kartu Biru" masuk
--     rekonsiliasi (fisik = Σ kategori − Σ pengeluaran) + 4 ttd.
--   • Pengeluaran pakai alur persetujuan: diajukan bendahara,
--     di-ACC Super Admin / user yang diberi izin (boleh_approve).
--
-- Aman dijalankan ulang pada project pra-peluncuran: script ini
-- menghapus objek lama lalu membangun ulang dari nol.
-- Jalankan seluruh isi file ini di Supabase SQL Editor.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- RESET (urutan aman terhadap dependensi)
-- ============================================================
DROP VIEW IF EXISTS v_status_perpuluhan, v_analitik_kas, v_anggaran_realisasi,
  v_arus_kas, v_neraca, v_laporan_aktivitas, v_rekap_saldo_kas, dashboard_summary,
  pengeluaran_per_kategori, ringkasan_bulanan CASCADE;

DROP TABLE IF EXISTS jurnal_umum_detail, jurnal_umum, sesi_pecahan,
  persembahan, pengeluaran, anggaran, sesi_ibadah, anggota,
  log_restore, log_backup, kas_akses, kategori_persembahan, kas,
  kategori_pengeluaran, akun, profiles CASCADE;

DROP TABLE IF EXISTS jurnal_kas CASCADE; -- tabel v1 lama, digantikan jurnal_umum

DROP TYPE IF EXISTS user_role, offering_type, expense_status, budget_period,
  akun_tipe, saldo_normal_tipe, sesi_status, jurnal_sumber,
  backup_tipe, backup_status CASCADE;

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE user_role        AS ENUM ('bendahara', 'majelis', 'admin', 'volunteer');
CREATE TYPE expense_status    AS ENUM ('pending', 'disetujui', 'ditolak');
CREATE TYPE budget_period     AS ENUM ('bulanan', 'triwulan', 'tahunan');
CREATE TYPE akun_tipe         AS ENUM ('aset', 'kewajiban', 'ekuitas', 'pendapatan', 'beban');
CREATE TYPE saldo_normal_tipe AS ENUM ('debit', 'kredit');
CREATE TYPE sesi_status       AS ENUM ('draft', 'balanced', 'signed_locked');
CREATE TYPE jurnal_sumber     AS ENUM ('persembahan', 'pengeluaran', 'manual');
CREATE TYPE backup_tipe       AS ENUM ('manual', 'otomatis');
CREATE TYPE backup_status     AS ENUM ('berjalan', 'sukses', 'gagal');
-- Catatan: offering_type (ENUM) dihapus — diganti tabel kategori_persembahan.

-- ============================================================
-- TABLE: profiles (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'majelis',
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,         -- gating restore & kontrol penuh (PRD §6C)
  boleh_approve_pengeluaran BOOLEAN NOT NULL DEFAULT false, -- izin ACC pengeluaran (diberikan Super Admin)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: akun (Chart of Accounts)
-- Tiap kas punya sub-akun aset (1-11xx) agar laporan per-kas akurat.
-- ============================================================
CREATE TABLE akun (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  kode_akun TEXT NOT NULL UNIQUE,
  nama_akun TEXT NOT NULL,
  tipe akun_tipe NOT NULL,
  saldo_normal saldo_normal_tipe NOT NULL,
  parent_id UUID REFERENCES akun(id),
  is_header BOOLEAN DEFAULT false,    -- akun induk (tidak menampung transaksi)
  is_aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO akun (kode_akun, nama_akun, tipe, saldo_normal, is_header) VALUES
  ('1-0000', 'ASET',                          'aset',       'debit',  true),
  -- Sub-akun aset per kas (1 kas = 1 akun)
  ('1-1101', 'Kas PK',                         'aset',       'debit',  false),
  ('1-1102', 'Kas Anak Asuh',                  'aset',       'debit',  false),
  ('1-1103', 'Kas Kids',                       'aset',       'debit',  false),
  ('1-1104', 'Kas Bimbel',                     'aset',       'debit',  false),
  ('1-1105', 'Kas Next Gen',                   'aset',       'debit',  false),
  ('1-1106', 'Kas HRD',                        'aset',       'debit',  false),
  ('1-1107', 'Kas EO - Induk',                 'aset',       'debit',  false),
  ('1-1108', 'Kas Volunteer Days',             'aset',       'debit',  false),
  ('1-1109', 'Kas Multimedia',                 'aset',       'debit',  false),
  ('1-1110', 'Kas Komsel',                     'aset',       'debit',  false),
  ('1-1111', 'Kas Pembangunan - Perehapan',    'aset',       'debit',  false),
  ('1-1112', 'Kas Pembangunan - Janji Iman',   'aset',       'debit',  false),
  ('1-1113', 'Kas EO - Kantin Mini',           'aset',       'debit',  false),
  ('1-1114', 'Kas Sport',                      'aset',       'debit',  false),
  ('1-1115', 'Kas Sewa Rumah',                 'aset',       'debit',  false),
  ('1-1100', 'Piutang Janji Iman',            'aset',       'debit',  false),
  ('1-2001', 'Peralatan & Inventaris',        'aset',       'debit',  false),
  ('2-0000', 'KEWAJIBAN',                     'kewajiban',  'kredit', true),
  ('2-1001', 'Utang Usaha',                   'kewajiban',  'kredit', false),
  ('3-0000', 'EKUITAS / DANA',                'ekuitas',    'kredit', true),
  ('3-1001', 'Dana Tidak Terikat',            'ekuitas',    'kredit', false),
  ('3-1002', 'Dana Terikat',                  'ekuitas',    'kredit', false),
  ('4-0000', 'PENDAPATAN',                    'pendapatan', 'kredit', true),
  ('4-1001', 'Perpuluhan',                    'pendapatan', 'kredit', false),
  ('4-1002', 'Persembahan Umum',              'pendapatan', 'kredit', false),
  ('4-1003', 'Janji Iman',                    'pendapatan', 'kredit', false),
  ('4-1004', 'Persembahan Khusus',            'pendapatan', 'kredit', false),
  ('4-1005', 'Kolekte',                       'pendapatan', 'kredit', false),
  ('4-1009', 'Pendapatan Lainnya',            'pendapatan', 'kredit', false),
  ('5-0000', 'BEBAN',                         'beban',      'debit',  true),
  ('5-1001', 'Beban Operasional',             'beban',      'debit',  false),
  ('5-1002', 'Beban Pelayanan',               'beban',      'debit',  false),
  ('5-1003', 'Beban Diakonia',                'beban',      'debit',  false),
  ('5-1004', 'Beban Renovasi & Pemeliharaan', 'beban',      'debit',  false),
  ('5-1005', 'Beban Administrasi',            'beban',      'debit',  false),
  ('5-1006', 'Beban Misi & Penginjilan',      'beban',      'debit',  false),
  ('5-1007', 'Beban Pendidikan & Pelatihan',  'beban',      'debit',  false),
  ('5-2003', 'Beban Administrasi Bank',       'beban',      'debit',  false),
  ('5-1009', 'Beban Lainnya',                 'beban',      'debit',  false);

-- ============================================================
-- TABLE: kas (Multi-Wallet) — Super Admin yang menambah/mengurangi.
-- 15 kas awal di-seed (lihat "Rekapan Saldo Kas"); bisa ditambah lewat web.
-- ============================================================
CREATE TABLE kas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama TEXT NOT NULL,
  akun_id UUID REFERENCES akun(id),       -- sub-akun Aset terkait di COA
  penanggung_jawab TEXT,                  -- nama "MH" pemegang kas (info)
  saldo_awal DECIMAL(15,2) DEFAULT 0,
  saldo_saat_ini DECIMAL(15,2) DEFAULT 0, -- di-maintain trigger
  tipe TEXT DEFAULT 'tunai',              -- tunai | bank | digital (bebas)
  nomor_rekening TEXT,
  nama_bank TEXT,
  keterangan TEXT,
  urutan INTEGER DEFAULT 0,
  is_aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO kas (nama, tipe, urutan, penanggung_jawab, akun_id) VALUES
  ('PK',                         'tunai', 1,  'Endang',           (SELECT id FROM akun WHERE kode_akun='1-1101')),
  ('Anak Asuh',                  'tunai', 2,  'Endang',           (SELECT id FROM akun WHERE kode_akun='1-1102')),
  ('Kids',                       'tunai', 3,  'Juliana',          (SELECT id FROM akun WHERE kode_akun='1-1103')),
  ('Bimbel',                     'tunai', 4,  'Juliana',          (SELECT id FROM akun WHERE kode_akun='1-1104')),
  ('Next Gen',                   'tunai', 5,  'Cindy',            (SELECT id FROM akun WHERE kode_akun='1-1105')),
  ('HRD',                        'tunai', 6,  'Cindy',            (SELECT id FROM akun WHERE kode_akun='1-1106')),
  ('EO - Induk',                 'tunai', 7,  'Cindy',            (SELECT id FROM akun WHERE kode_akun='1-1107')),
  ('Volunteer Days',             'tunai', 8,  'Cindy',            (SELECT id FROM akun WHERE kode_akun='1-1108')),
  ('Multimedia',                 'tunai', 9,  'Ferlianty/Aceng',  (SELECT id FROM akun WHERE kode_akun='1-1109')),
  ('Komsel',                     'tunai', 10, 'Ferlianty/Aceng',  (SELECT id FROM akun WHERE kode_akun='1-1110')),
  ('Pembangunan - Perehapan',    'tunai', 11, 'Yuliana/Achiang',  (SELECT id FROM akun WHERE kode_akun='1-1111')),
  ('Pembangunan - Janji Iman',   'tunai', 12, 'Yuliana/Achiang',  (SELECT id FROM akun WHERE kode_akun='1-1112')),
  ('EO - Kantin Mini',           'tunai', 13, 'Stephanie',        (SELECT id FROM akun WHERE kode_akun='1-1113')),
  ('Sport',                      'tunai', 14, 'Elyon',            (SELECT id FROM akun WHERE kode_akun='1-1114')),
  ('Sewa Rumah',                 'tunai', 15, 'Elyon',            (SELECT id FROM akun WHERE kode_akun='1-1115'));

-- ============================================================
-- TABLE: kas_akses — siapa (bendahara) boleh akses kas mana.
-- Diatur Super Admin. Super Admin & Admin otomatis akses semua (lihat RLS).
-- ============================================================
CREATE TABLE kas_akses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  kas_id UUID NOT NULL REFERENCES kas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kas_id, user_id)
);
CREATE INDEX idx_kas_akses_user ON kas_akses(user_id);

-- ============================================================
-- TABLE: kategori_persembahan — DICUSTOM Super Admin (ganti ENUM lama).
-- Tiap kategori menuju SATU kas + 1 akun pendapatan untuk jurnal.
-- butuh_nama = true → input mengumpulkan daftar nama pemberi.
-- ============================================================
CREATE TABLE kategori_persembahan (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama TEXT NOT NULL,
  kas_id UUID REFERENCES kas(id),              -- kas tujuan
  akun_pendapatan_id UUID REFERENCES akun(id), -- akun Pendapatan di COA
  butuh_nama BOOLEAN NOT NULL DEFAULT false,   -- kumpulkan daftar nama pemberi?
  is_perpuluhan BOOLEAN NOT NULL DEFAULT false,-- dipakai utk laporan status perpuluhan
  warna TEXT DEFAULT '#6366F1',
  urutan INTEGER DEFAULT 0,
  is_aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed kategori awal dari form Anda. Pasangan kas → SESUAIKAN nanti via web
-- Super Admin bila tidak pas (mapping di bawah adalah tebakan wajar).
INSERT INTO kategori_persembahan (nama, kas_id, akun_pendapatan_id, butuh_nama, is_perpuluhan, urutan) VALUES
  ('Ibadah Raya',       (SELECT id FROM kas WHERE nama='EO - Induk'),                (SELECT id FROM akun WHERE kode_akun='4-1002'), false, false, 1),
  ('Persepuluhan',      (SELECT id FROM kas WHERE nama='PK'),                        (SELECT id FROM akun WHERE kode_akun='4-1001'), true,  true,  2),
  ('Ucapan Syukur',     (SELECT id FROM kas WHERE nama='EO - Induk'),                (SELECT id FROM akun WHERE kode_akun='4-1004'), true,  false, 3),
  ('Buah Sulung',       (SELECT id FROM kas WHERE nama='EO - Induk'),                (SELECT id FROM akun WHERE kode_akun='4-1009'), true,  false, 4),
  ('Pembangunan Gedung',(SELECT id FROM kas WHERE nama='Pembangunan - Janji Iman'),  (SELECT id FROM akun WHERE kode_akun='4-1004'), true,  false, 5),
  ('Perehapan',         (SELECT id FROM kas WHERE nama='Pembangunan - Perehapan'),   (SELECT id FROM akun WHERE kode_akun='4-1004'), true,  false, 6),
  ('Janji Iman',        (SELECT id FROM kas WHERE nama='Pembangunan - Janji Iman'),  (SELECT id FROM akun WHERE kode_akun='4-1003'), true,  false, 7),
  ('Anak Asuh',         (SELECT id FROM kas WHERE nama='Anak Asuh'),                 (SELECT id FROM akun WHERE kode_akun='4-1004'), true,  false, 8),
  ('Diakonia',          (SELECT id FROM kas WHERE nama='Anak Asuh'),                 (SELECT id FROM akun WHERE kode_akun='4-1004'), true,  false, 9),
  ('Kolekte',           (SELECT id FROM kas WHERE nama='EO - Induk'),                (SELECT id FROM akun WHERE kode_akun='4-1005'), false, false, 10),
  ('Lainnya',           (SELECT id FROM kas WHERE nama='EO - Induk'),                (SELECT id FROM akun WHERE kode_akun='4-1009'), false, false, 11);

-- ============================================================
-- TABLE: kategori_pengeluaran
-- ============================================================
CREATE TABLE kategori_pengeluaran (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama TEXT NOT NULL,
  deskripsi TEXT,
  warna TEXT DEFAULT '#6366F1',
  icon TEXT DEFAULT 'folder',
  akun_id UUID REFERENCES akun(id),       -- akun Beban terkait di COA
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO kategori_pengeluaran (nama, deskripsi, warna, icon, akun_id) VALUES
  ('Operasional', 'Listrik, air, internet, ATK', '#3B82F6', 'settings', (SELECT id FROM akun WHERE kode_akun='5-1001')),
  ('Pelayanan', 'Kebutuhan ibadah, musik, dekorasi', '#8B5CF6', 'church', (SELECT id FROM akun WHERE kode_akun='5-1002')),
  ('Diakonia', 'Bantuan sosial, dana duka, beasiswa', '#10B981', 'heart', (SELECT id FROM akun WHERE kode_akun='5-1003')),
  ('Renovasi & Pemeliharaan', 'Perbaikan gedung dan fasilitas', '#F59E0B', 'tool', (SELECT id FROM akun WHERE kode_akun='5-1004')),
  ('Administrasi', 'Biaya administrasi, surat menyurat', '#6B7280', 'file', (SELECT id FROM akun WHERE kode_akun='5-1005')),
  ('Misi & Penginjilan', 'Kegiatan misi dan penginjilan', '#EF4444', 'globe', (SELECT id FROM akun WHERE kode_akun='5-1006')),
  ('Pendidikan & Pelatihan', 'Seminar, retreat, training', '#06B6D4', 'book', (SELECT id FROM akun WHERE kode_akun='5-1007')),
  ('Lainnya', 'Pengeluaran lainnya', '#9CA3AF', 'more-horizontal', (SELECT id FROM akun WHERE kode_akun='5-1009'));

-- ============================================================
-- TABLE: anggota — Registry Jemaat/Volunteer (PRD §5C)
-- ============================================================
CREATE TABLE anggota (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama TEXT NOT NULL,
  kontak TEXT,
  divisi_pelayanan TEXT,
  is_volunteer BOOLEAN DEFAULT false,
  wajib_perpuluhan BOOLEAN DEFAULT true,  -- masuk daftar centang atau tidak
  is_aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: sesi_ibadah (Post-service cash reconciliation)
-- ============================================================
CREATE TABLE sesi_ibadah (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama_sesi TEXT,                                       -- nama custom (mis. "Persembahan Pagi")
  jenis_ibadah TEXT NOT NULL,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jam TIME,
  ibadah_ke INTEGER,
  kas_id UUID REFERENCES kas(id),                       -- kas utama sesi (opsional; kategori bisa beda kas)
  status sesi_status NOT NULL DEFAULT 'draft',
  total_fisik DECIMAL(15,2) NOT NULL DEFAULT 0,         -- Σ denominasi (uang dihitung)
  total_kategori DECIMAL(15,2) NOT NULL DEFAULT 0,      -- Σ persembahan
  total_pengeluaran DECIMAL(15,2) NOT NULL DEFAULT 0,   -- Σ "Kartu Biru" (pending+disetujui)
  -- MATCH bila selisih = 0  →  fisik = kategori − pengeluaran
  selisih DECIMAL(15,2) GENERATED ALWAYS AS (total_fisik - total_kategori + total_pengeluaran) STORED,
  nama_gembala TEXT,        ttd_gembala_url TEXT,
  nama_bendahara TEXT,      ttd_bendahara_url TEXT,
  nama_penghitung1 TEXT,    ttd_penghitung1_url TEXT,
  nama_penghitung2 TEXT,    ttd_penghitung2_url TEXT,
  signed_at TIMESTAMPTZ,
  catatan TEXT,
  dibuka_oleh UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: sesi_pecahan (Denomination calculator lines)
-- ============================================================
CREATE TABLE sesi_pecahan (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sesi_id UUID NOT NULL REFERENCES sesi_ibadah(id) ON DELETE CASCADE,
  nominal DECIMAL(15,2) NOT NULL,
  jumlah_lembar INTEGER NOT NULL DEFAULT 0 CHECK (jumlah_lembar >= 0),
  subtotal DECIMAL(15,2) GENERATED ALWAYS AS (nominal * jumlah_lembar) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sesi_id, nominal)
);

-- ============================================================
-- TABLE: persembahan (Offerings) — per kategori; bisa banyak baris
-- (daftar nama pemberi) bila kategori.butuh_nama = true.
-- ============================================================
CREATE TABLE persembahan (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  kategori_id UUID NOT NULL REFERENCES kategori_persembahan(id),
  jumlah DECIMAL(15,2) NOT NULL CHECK (jumlah > 0),
  kas_id UUID REFERENCES kas(id),                       -- diisi OTOMATIS dari kategori.kas_id
  sesi_id UUID REFERENCES sesi_ibadah(id) ON DELETE SET NULL,
  anggota_id UUID REFERENCES anggota(id),               -- untuk auto-mark perpuluhan (PRD §5C)
  keterangan TEXT,
  nama_pemberi TEXT,                                     -- NULL = anonim
  metode_pembayaran TEXT DEFAULT 'tunai',
  nomor_referensi TEXT,
  dicatat_oleh UUID REFERENCES profiles(id),
  diverifikasi_oleh UUID REFERENCES profiles(id),
  is_verified BOOLEAN DEFAULT false,
  ibadah_ke INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_persembahan_sesi ON persembahan(sesi_id);
CREATE INDEX idx_persembahan_kategori ON persembahan(kategori_id);

-- ============================================================
-- TABLE: pengeluaran (Expenses) — alur persetujuan.
-- Bisa ditautkan sesi (Kartu Biru) → masuk rekonsiliasi sesi.
-- ============================================================
CREATE TABLE pengeluaran (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  kategori_id UUID REFERENCES kategori_pengeluaran(id),
  kas_id UUID REFERENCES kas(id),
  sesi_id UUID REFERENCES sesi_ibadah(id) ON DELETE SET NULL, -- "Kartu Biru" bila terisi
  jumlah DECIMAL(15,2) NOT NULL CHECK (jumlah > 0),
  keterangan TEXT NOT NULL,
  penerima TEXT,
  metode_pembayaran TEXT DEFAULT 'tunai',
  nomor_referensi TEXT,
  bukti_url TEXT,
  status expense_status DEFAULT 'pending',
  diajukan_oleh UUID REFERENCES profiles(id),
  disetujui_oleh UUID REFERENCES profiles(id),
  disetujui_pada TIMESTAMPTZ,
  catatan_penolakan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pengeluaran_sesi ON pengeluaran(sesi_id);

-- ============================================================
-- TABLE: anggaran (Budget) — per kategori/divisi
-- ============================================================
CREATE TABLE anggaran (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tahun INTEGER NOT NULL,
  bulan INTEGER CHECK (bulan BETWEEN 1 AND 12),   -- NULL = tahunan
  kategori_id UUID REFERENCES kategori_pengeluaran(id),
  nama_pos TEXT NOT NULL,
  jumlah_dianggarkan DECIMAL(15,2) NOT NULL CHECK (jumlah_dianggarkan >= 0),
  keterangan TEXT,
  periode budget_period DEFAULT 'bulanan',
  dibuat_oleh UUID REFERENCES profiles(id),
  disetujui BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tahun, bulan, kategori_id, nama_pos)
);

-- ============================================================
-- TABLE: jurnal_umum (+ detail) — General Ledger universal
-- ============================================================
CREATE TABLE jurnal_umum (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan TEXT,
  sumber jurnal_sumber NOT NULL DEFAULT 'manual',
  sumber_id UUID,                         -- id transaksi asal (auto-posting)
  dicatat_oleh UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE jurnal_umum_detail (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  jurnal_id UUID NOT NULL REFERENCES jurnal_umum(id) ON DELETE CASCADE,
  akun_id UUID NOT NULL REFERENCES akun(id),
  debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  kredit DECIMAL(15,2) NOT NULL DEFAULT 0
);
CREATE INDEX idx_jurnal_detail_jurnal ON jurnal_umum_detail(jurnal_id);
CREATE INDEX idx_jurnal_detail_akun ON jurnal_umum_detail(akun_id);
CREATE INDEX idx_jurnal_sumber ON jurnal_umum(sumber, sumber_id);

-- ============================================================
-- TABLE: log_backup & log_restore (PRD §6)
-- ============================================================
CREATE TABLE log_backup (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tipe backup_tipe NOT NULL DEFAULT 'manual',
  status backup_status NOT NULL DEFAULT 'sukses',
  ukuran_bytes BIGINT,
  storage_path TEXT,
  format TEXT DEFAULT 'xlsx+json',
  pelaksana TEXT,                         -- 'Sistem' | nama admin
  pesan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE log_restore (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dijalankan_oleh UUID REFERENCES profiles(id),
  nama_pelaksana TEXT,
  file_sumber TEXT,
  ringkasan JSONB,                        -- jumlah baris per tabel
  status TEXT DEFAULT 'sukses',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_akun_updated BEFORE UPDATE ON akun FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_kas_updated BEFORE UPDATE ON kas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_kategori_persembahan_updated BEFORE UPDATE ON kategori_persembahan FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_anggota_updated BEFORE UPDATE ON anggota FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_sesi_updated BEFORE UPDATE ON sesi_ibadah FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_pecahan_updated BEFORE UPDATE ON sesi_pecahan FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_persembahan_updated BEFORE UPDATE ON persembahan FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_pengeluaran_updated BEFORE UPDATE ON pengeluaran FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_anggaran_updated BEFORE UPDATE ON anggaran FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Buat profile otomatis saat user auth baru
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'majelis')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Isi kas_id persembahan dari kategori bila kosong (tiap kategori → 1 kas)
CREATE OR REPLACE FUNCTION set_kas_persembahan()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kas_id IS NULL AND NEW.kategori_id IS NOT NULL THEN
    SELECT kas_id INTO NEW.kas_id FROM kategori_persembahan WHERE id = NEW.kategori_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_persembahan_set_kas BEFORE INSERT OR UPDATE ON persembahan FOR EACH ROW EXECUTE FUNCTION set_kas_persembahan();

-- Default kas pengeluaran bila kosong (fallback ke kas aktif pertama)
CREATE OR REPLACE FUNCTION set_default_kas()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kas_id IS NULL THEN
    SELECT id INTO NEW.kas_id FROM kas WHERE is_aktif = true ORDER BY urutan, created_at LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_pengeluaran_default_kas BEFORE INSERT ON pengeluaran FOR EACH ROW EXECUTE FUNCTION set_default_kas();

-- Hitung ulang saldo kas dari sumber kebenaran (anti-drift)
CREATE OR REPLACE FUNCTION recalc_saldo_kas(p_kas UUID)
RETURNS VOID AS $$
BEGIN
  IF p_kas IS NULL THEN RETURN; END IF;
  UPDATE kas k SET saldo_saat_ini =
      COALESCE(k.saldo_awal,0)
    + COALESCE((SELECT SUM(jumlah) FROM persembahan WHERE kas_id = p_kas), 0)
    - COALESCE((SELECT SUM(jumlah) FROM pengeluaran WHERE kas_id = p_kas AND status='disetujui'), 0)
  WHERE k.id = p_kas;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION akun_id_by_kode(p_kode TEXT)
RETURNS UUID AS $$ SELECT id FROM akun WHERE kode_akun = p_kode LIMIT 1; $$ LANGUAGE sql STABLE;

-- Posting / un-posting jurnal otomatis
CREATE OR REPLACE FUNCTION unpost_jurnal(p_sumber jurnal_sumber, p_sumber_id UUID)
RETURNS VOID AS $$
BEGIN DELETE FROM jurnal_umum WHERE sumber = p_sumber AND sumber_id = p_sumber_id; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION post_jurnal(
  p_tanggal DATE, p_ket TEXT, p_sumber jurnal_sumber, p_sumber_id UUID,
  p_debit_akun UUID, p_kredit_akun UUID, p_jumlah DECIMAL
) RETURNS VOID AS $$
DECLARE v_jid UUID;
BEGIN
  IF p_debit_akun IS NULL OR p_kredit_akun IS NULL OR p_jumlah IS NULL OR p_jumlah = 0 THEN
    RETURN;
  END IF;
  INSERT INTO jurnal_umum (tanggal, keterangan, sumber, sumber_id)
  VALUES (p_tanggal, p_ket, p_sumber, p_sumber_id) RETURNING id INTO v_jid;
  INSERT INTO jurnal_umum_detail (jurnal_id, akun_id, debit, kredit) VALUES
    (v_jid, p_debit_akun, p_jumlah, 0),
    (v_jid, p_kredit_akun, 0, p_jumlah);
END;
$$ LANGUAGE plpgsql;

-- PERSEMBAHAN: Debit Kas | Kredit Pendapatan (akun dari kategori)
CREATE OR REPLACE FUNCTION trg_persembahan_post()
RETURNS TRIGGER AS $$
DECLARE v_kas_akun UUID; v_pend_akun UUID; v_nama TEXT;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN PERFORM unpost_jurnal('persembahan', OLD.id); END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT akun_id INTO v_kas_akun FROM kas WHERE id = NEW.kas_id;
    SELECT akun_pendapatan_id, nama INTO v_pend_akun, v_nama FROM kategori_persembahan WHERE id = NEW.kategori_id;
    PERFORM post_jurnal(NEW.tanggal, 'Persembahan: ' || COALESCE(v_nama,'-'),
      'persembahan', NEW.id, v_kas_akun, v_pend_akun, NEW.jumlah);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.kas_id IS DISTINCT FROM NEW.kas_id THEN PERFORM recalc_saldo_kas(OLD.kas_id); END IF;
  IF TG_OP = 'DELETE' THEN PERFORM recalc_saldo_kas(OLD.kas_id); RETURN OLD;
  ELSE PERFORM recalc_saldo_kas(NEW.kas_id); RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_persembahan_post
  AFTER INSERT OR UPDATE OR DELETE ON persembahan
  FOR EACH ROW EXECUTE FUNCTION trg_persembahan_post();

-- PENGELUARAN (saat disetujui): Debit Beban | Kredit Kas
CREATE OR REPLACE FUNCTION trg_pengeluaran_post()
RETURNS TRIGGER AS $$
DECLARE v_kas_akun UUID; v_beban_akun UUID;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN PERFORM unpost_jurnal('pengeluaran', OLD.id); END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.status = 'disetujui' THEN
    SELECT akun_id INTO v_kas_akun FROM kas WHERE id = NEW.kas_id;
    SELECT akun_id INTO v_beban_akun FROM kategori_pengeluaran WHERE id = NEW.kategori_id;
    PERFORM post_jurnal(COALESCE(NEW.disetujui_pada::date, NEW.tanggal),
      'Pengeluaran: ' || NEW.keterangan, 'pengeluaran', NEW.id,
      v_beban_akun, v_kas_akun, NEW.jumlah);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.kas_id IS DISTINCT FROM NEW.kas_id THEN PERFORM recalc_saldo_kas(OLD.kas_id); END IF;
  IF TG_OP = 'DELETE' THEN PERFORM recalc_saldo_kas(OLD.kas_id); RETURN OLD;
  ELSE PERFORM recalc_saldo_kas(NEW.kas_id); RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_pengeluaran_post
  AFTER INSERT OR UPDATE OR DELETE ON pengeluaran
  FOR EACH ROW EXECUTE FUNCTION trg_pengeluaran_post();

-- Recalc total sesi: fisik (denominasi), kategori (persembahan), pengeluaran (kartu biru)
CREATE OR REPLACE FUNCTION recalc_sesi(p_sesi UUID)
RETURNS VOID AS $$
BEGIN
  IF p_sesi IS NULL THEN RETURN; END IF;
  UPDATE sesi_ibadah s SET
    total_fisik = COALESCE((SELECT SUM(subtotal) FROM sesi_pecahan WHERE sesi_id = p_sesi),0),
    total_kategori = COALESCE((SELECT SUM(jumlah) FROM persembahan WHERE sesi_id = p_sesi),0),
    total_pengeluaran = COALESCE((SELECT SUM(jumlah) FROM pengeluaran
                                  WHERE sesi_id = p_sesi AND status <> 'ditolak'),0)
  WHERE s.id = p_sesi;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_recalc_sesi_pecahan()
RETURNS TRIGGER AS $$
BEGIN PERFORM recalc_sesi(COALESCE(NEW.sesi_id, OLD.sesi_id)); RETURN COALESCE(NEW, OLD); END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_recalc_sesi_pecahan
  AFTER INSERT OR UPDATE OR DELETE ON sesi_pecahan
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_sesi_pecahan();

CREATE OR REPLACE FUNCTION trg_recalc_sesi_persembahan()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.sesi_id IS DISTINCT FROM NEW.sesi_id THEN PERFORM recalc_sesi(OLD.sesi_id); END IF;
  PERFORM recalc_sesi(COALESCE(NEW.sesi_id, OLD.sesi_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_recalc_sesi_persembahan
  AFTER INSERT OR UPDATE OR DELETE ON persembahan
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_sesi_persembahan();

-- Kartu Biru: pengeluaran bertaut sesi → recalc total_pengeluaran sesi
CREATE OR REPLACE FUNCTION trg_recalc_sesi_pengeluaran()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.sesi_id IS DISTINCT FROM NEW.sesi_id THEN PERFORM recalc_sesi(OLD.sesi_id); END IF;
  PERFORM recalc_sesi(COALESCE(NEW.sesi_id, OLD.sesi_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_recalc_sesi_pengeluaran
  AFTER INSERT OR UPDATE OR DELETE ON pengeluaran
  FOR EACH ROW EXECUTE FUNCTION trg_recalc_sesi_pengeluaran();

-- Penguncian data sesi signed_locked (PRD §3.5) — blokir edit persembahan & pecahan
CREATE OR REPLACE FUNCTION trg_block_locked_sesi()
RETURNS TRIGGER AS $$
DECLARE v_status sesi_status;
BEGIN
  IF NEW.sesi_id IS NULL THEN RETURN NEW; END IF;
  SELECT status INTO v_status FROM sesi_ibadah WHERE id = NEW.sesi_id;
  IF v_status = 'signed_locked' THEN
    RAISE EXCEPTION 'Sesi ibadah sudah terkunci (signed_locked); data tidak dapat diubah.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_block_locked_persembahan
  BEFORE UPDATE ON persembahan FOR EACH ROW EXECUTE FUNCTION trg_block_locked_sesi();
CREATE TRIGGER t_block_locked_pecahan
  BEFORE INSERT OR UPDATE ON sesi_pecahan FOR EACH ROW EXECUTE FUNCTION trg_block_locked_sesi();

-- ============================================================
-- VIEWS — Dashboard & Laporan
-- ============================================================

CREATE VIEW ringkasan_bulanan AS
SELECT DATE_TRUNC('month', tanggal) AS bulan,
       EXTRACT(YEAR FROM tanggal)::int AS tahun,
       EXTRACT(MONTH FROM tanggal)::int AS bulan_ke,
       SUM(jumlah) AS total_persembahan, COUNT(*) AS jumlah_transaksi
FROM persembahan GROUP BY 1,2,3 ORDER BY 1 DESC;

CREATE VIEW pengeluaran_per_kategori AS
SELECT DATE_TRUNC('month', p.tanggal) AS bulan, k.nama AS kategori, k.warna,
       SUM(p.jumlah) AS total, COUNT(*) AS jumlah_transaksi
FROM pengeluaran p LEFT JOIN kategori_pengeluaran k ON p.kategori_id = k.id
WHERE p.status = 'disetujui' GROUP BY 1,2,3 ORDER BY 1 DESC, 4 DESC;

CREATE VIEW dashboard_summary AS
SELECT
  (SELECT COALESCE(SUM(jumlah),0) FROM persembahan WHERE DATE_TRUNC('month',tanggal)=DATE_TRUNC('month',NOW())) AS pemasukan_bulan_ini,
  (SELECT COALESCE(SUM(jumlah),0) FROM pengeluaran WHERE DATE_TRUNC('month',tanggal)=DATE_TRUNC('month',NOW()) AND status='disetujui') AS pengeluaran_bulan_ini,
  (SELECT COALESCE(SUM(jumlah),0) FROM persembahan WHERE DATE_TRUNC('year',tanggal)=DATE_TRUNC('year',NOW())) AS pemasukan_tahun_ini,
  (SELECT COALESCE(SUM(jumlah),0) FROM pengeluaran WHERE DATE_TRUNC('year',tanggal)=DATE_TRUNC('year',NOW()) AND status='disetujui') AS pengeluaran_tahun_ini,
  (SELECT COUNT(*) FROM pengeluaran WHERE status='pending') AS pengeluaran_pending,
  (SELECT COALESCE(SUM(saldo_saat_ini),0) FROM kas WHERE is_aktif=true) AS total_saldo;

-- Rekap saldo per kas (seperti "Rekapan Saldo Kas")
CREATE VIEW v_rekap_saldo_kas AS
SELECT k.id AS kas_id, k.nama AS kas_nama, k.penanggung_jawab, k.tipe,
       k.saldo_awal, k.saldo_saat_ini, k.urutan, k.is_aktif
FROM kas k ORDER BY k.urutan, k.nama;

-- Laporan Aktivitas (Income Statement) — dari jurnal
CREATE VIEW v_laporan_aktivitas AS
SELECT a.id AS akun_id, a.kode_akun, a.nama_akun, a.tipe,
       DATE_TRUNC('month', j.tanggal) AS bulan,
       EXTRACT(YEAR FROM j.tanggal)::int AS tahun,
       CASE WHEN a.tipe='pendapatan' THEN SUM(d.kredit - d.debit)
            WHEN a.tipe='beban'      THEN SUM(d.debit - d.kredit) ELSE 0 END AS nilai
FROM jurnal_umum_detail d
JOIN jurnal_umum j ON j.id = d.jurnal_id
JOIN akun a ON a.id = d.akun_id
WHERE a.tipe IN ('pendapatan','beban')
GROUP BY a.id, a.kode_akun, a.nama_akun, a.tipe, DATE_TRUNC('month', j.tanggal), EXTRACT(YEAR FROM j.tanggal);

-- Neraca (Balance Sheet) — saldo berjalan per akun.
CREATE VIEW v_neraca AS
SELECT a.id AS akun_id, a.kode_akun, a.nama_akun, a.tipe, a.saldo_normal,
       (CASE WHEN a.saldo_normal='debit' THEN COALESCE(SUM(d.debit - d.kredit),0)
             ELSE COALESCE(SUM(d.kredit - d.debit),0) END)
       + COALESCE((SELECT SUM(k.saldo_awal) FROM kas k WHERE k.akun_id = a.id),0) AS saldo
FROM akun a LEFT JOIN jurnal_umum_detail d ON d.akun_id = a.id
WHERE a.tipe IN ('aset','kewajiban','ekuitas') AND a.is_header = false
GROUP BY a.id, a.kode_akun, a.nama_akun, a.tipe, a.saldo_normal
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid, '3-9000', 'Saldo Dana Awal',
       'ekuitas'::akun_tipe, 'kredit'::saldo_normal_tipe,
       COALESCE((SELECT SUM(k.saldo_awal) FROM kas k
                 JOIN akun a ON a.id = k.akun_id
                 WHERE a.tipe='aset' AND a.is_header=false),0)
WHERE COALESCE((SELECT SUM(k.saldo_awal) FROM kas k
                JOIN akun a ON a.id = k.akun_id
                WHERE a.tipe='aset' AND a.is_header=false),0) <> 0
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid, '3-9999', 'Surplus/(Defisit) Berjalan',
       'ekuitas'::akun_tipe, 'kredit'::saldo_normal_tipe,
       COALESCE((SELECT SUM(d.kredit - d.debit) FROM jurnal_umum_detail d
                 JOIN akun a ON a.id = d.akun_id WHERE a.tipe IN ('pendapatan','beban')),0)
WHERE COALESCE((SELECT SUM(d.kredit - d.debit) FROM jurnal_umum_detail d
                JOIN akun a ON a.id = d.akun_id WHERE a.tipe IN ('pendapatan','beban')),0) <> 0;

-- Arus Kas (Cash Flow) — mutasi akun kas/bank per bulan
CREATE VIEW v_arus_kas AS
SELECT k.id AS kas_id, k.nama AS kas_nama, DATE_TRUNC('month', j.tanggal) AS bulan,
       SUM(d.debit) AS kas_masuk, SUM(d.kredit) AS kas_keluar, SUM(d.debit - d.kredit) AS arus_bersih
FROM kas k
JOIN akun a ON a.id = k.akun_id
JOIN jurnal_umum_detail d ON d.akun_id = a.id
JOIN jurnal_umum j ON j.id = d.jurnal_id
GROUP BY k.id, k.nama, DATE_TRUNC('month', j.tanggal) ORDER BY bulan DESC;

-- Anggaran vs Realisasi
CREATE VIEW v_anggaran_realisasi AS
SELECT ag.id AS anggaran_id, ag.tahun, ag.bulan, ag.nama_pos, kat.nama AS kategori,
       ag.jumlah_dianggarkan,
       COALESCE((SELECT SUM(p.jumlah) FROM pengeluaran p
         WHERE p.kategori_id = ag.kategori_id AND p.status='disetujui'
           AND EXTRACT(YEAR FROM p.tanggal) = ag.tahun
           AND (ag.bulan IS NULL OR EXTRACT(MONTH FROM p.tanggal) = ag.bulan)),0) AS realisasi
FROM anggaran ag LEFT JOIN kategori_pengeluaran kat ON kat.id = ag.kategori_id;

-- Analitik Kas mendetail (PRD §5A)
CREATE VIEW v_analitik_kas AS
SELECT k.id AS kas_id, k.nama AS kas_nama, k.tipe, k.saldo_saat_ini,
       DATE_TRUNC('month', j.tanggal) AS bulan,
       SUM(d.debit) AS masuk, SUM(d.kredit) AS keluar
FROM kas k
JOIN akun a ON a.id = k.akun_id
LEFT JOIN jurnal_umum_detail d ON d.akun_id = a.id
LEFT JOIN jurnal_umum j ON j.id = d.jurnal_id
GROUP BY k.id, k.nama, k.tipe, k.saldo_saat_ini, DATE_TRUNC('month', j.tanggal);

-- Status Perpuluhan per anggota per periode (PRD §5C) — auto-mark.
-- SECURITY DEFINER agar checklist tetap whole-church (oversight) walau RLS
-- persembahan dibatasi per-kas utk bendahara di bawah — lihat §ROW LEVEL SECURITY.
CREATE OR REPLACE FUNCTION cek_sudah_perpuluhan(p_anggota UUID, p_tahun INT, p_bulan INT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM persembahan p
    JOIN kategori_persembahan kp ON kp.id = p.kategori_id
    WHERE p.anggota_id = p_anggota AND kp.is_perpuluhan
      AND EXTRACT(YEAR FROM p.tanggal) = p_tahun AND EXTRACT(MONTH FROM p.tanggal) = p_bulan);
$$;

CREATE VIEW v_status_perpuluhan AS
SELECT an.id AS anggota_id, an.nama, an.kontak, an.divisi_pelayanan, an.is_volunteer,
       per.tahun, per.bulan,
       cek_sudah_perpuluhan(an.id, per.tahun, per.bulan) AS sudah_mengembalikan
FROM anggota an
CROSS JOIN (
  SELECT EXTRACT(YEAR FROM d)::int AS tahun, EXTRACT(MONTH FROM d)::int AS bulan
  FROM generate_series(date_trunc('month', NOW()) - INTERVAL '11 months',
                       date_trunc('month', NOW()), INTERVAL '1 month') d
) per
WHERE an.wajib_perpuluhan = true AND an.is_aktif = true;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE akun ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_akses ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori_persembahan ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori_pengeluaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesi_ibadah ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesi_pecahan ENABLE ROW LEVEL SECURITY;
ALTER TABLE persembahan ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengeluaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE anggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurnal_umum ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurnal_umum_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_restore ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('bendahara','admin'));
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true);
$$;

-- Boleh meng-ACC pengeluaran: Super Admin selalu, atau user yang diberi izin.
CREATE OR REPLACE FUNCTION boleh_approve()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles
                 WHERE id = auth.uid() AND (is_super_admin = true OR boleh_approve_pengeluaran = true));
$$;

-- Akses kas: Super Admin/Admin akses semua; lainnya hanya kas yang ditugaskan.
CREATE OR REPLACE FUNCTION punya_akses_kas(p_kas UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_superadmin() OR is_admin()
      OR EXISTS (SELECT 1 FROM public.kas_akses ka WHERE ka.kas_id = p_kas AND ka.user_id = auth.uid());
$$;

-- Boleh LIHAT data terkait kas ini: Admin/Super Admin/Majelis/Volunteer selalu;
-- Bendahara hanya kas yang ditugaskan padanya (kas_akses). Dipakai utk SELECT
-- (bukan tulis — tulis tetap pakai punya_akses_kas langsung).
CREATE OR REPLACE FUNCTION lihat_kas(p_kas UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_kas IS NULL THEN true
    WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'bendahara' THEN punya_akses_kas(p_kas)
    ELSE true
  END;
$$;

-- Boleh lihat sesi ini: non-bendahara selalu; bendahara hanya bila sesi
-- bertaut kas yang ia akses (lewat persembahan/pengeluaran), atau sesi yang
-- baru ia buka sendiri (belum ada persembahan sama sekali).
CREATE OR REPLACE FUNCTION lihat_sesi(p_sesi_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'bendahara' THEN true
    ELSE
      EXISTS (SELECT 1 FROM persembahan p WHERE p.sesi_id = p_sesi_id AND punya_akses_kas(p.kas_id))
      OR EXISTS (SELECT 1 FROM pengeluaran pe WHERE pe.sesi_id = p_sesi_id AND punya_akses_kas(pe.kas_id))
      OR EXISTS (SELECT 1 FROM sesi_ibadah s WHERE s.id = p_sesi_id AND s.dibuka_oleh = auth.uid())
  END;
$$;

-- Boleh lihat baris jurnal otomatis ini: non-bendahara selalu; bendahara
-- hanya bila transaksi sumbernya (persembahan/pengeluaran) bertaut kas yg ia
-- akses. Jurnal manual dicek terpisah di policy (lihat dicatat_oleh).
CREATE OR REPLACE FUNCTION lihat_jurnal(p_sumber jurnal_sumber, p_sumber_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'bendahara' THEN true
    WHEN p_sumber = 'persembahan' THEN EXISTS (SELECT 1 FROM persembahan p WHERE p.id = p_sumber_id AND punya_akses_kas(p.kas_id))
    WHEN p_sumber = 'pengeluaran' THEN EXISTS (SELECT 1 FROM pengeluaran pe WHERE pe.id = p_sumber_id AND punya_akses_kas(pe.kas_id))
    ELSE false
  END;
$$;

CREATE POLICY p_profiles_select ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY p_profiles_update ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin() OR is_superadmin());

CREATE POLICY p_akun_select ON akun FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY p_akun_manage ON akun FOR ALL USING (is_admin() OR is_superadmin()) WITH CHECK (is_admin() OR is_superadmin());

-- Kas hanya dikelola Super Admin (tambah/kurang); lihat dibatasi lihat_kas
-- (bendahara hanya kas yang ditugaskan; peran lain lihat semua).
CREATE POLICY p_kas_select ON kas FOR SELECT USING (auth.role() = 'authenticated' AND lihat_kas(id));
CREATE POLICY p_kas_manage ON kas FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- kas_akses: user lihat barisnya sendiri; Super Admin kelola semua.
CREATE POLICY p_kasakses_select ON kas_akses FOR SELECT USING (user_id = auth.uid() OR is_superadmin() OR is_admin());
CREATE POLICY p_kasakses_manage ON kas_akses FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- kategori_persembahan: dicustom Super Admin; semua boleh lihat.
CREATE POLICY p_katpers_select ON kategori_persembahan FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY p_katpers_manage ON kategori_persembahan FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY p_kat_select ON kategori_pengeluaran FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY p_kat_manage ON kategori_pengeluaran FOR ALL USING (is_admin() OR is_superadmin()) WITH CHECK (is_admin() OR is_superadmin());

CREATE POLICY p_anggota_select ON anggota FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY p_anggota_manage ON anggota FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- Sesi: lihat dibatasi lihat_sesi (bendahara hanya sesi bertaut kas yg ia
-- akses, atau sesi yg baru ia buka sendiri). Tulis tetap is_staff() — sesi
-- baru belum tentu bertaut kas spesifik di saat dibuat.
CREATE POLICY p_sesi_select ON sesi_ibadah FOR SELECT USING (auth.role() = 'authenticated' AND lihat_sesi(id));
CREATE POLICY p_sesi_insert ON sesi_ibadah FOR INSERT WITH CHECK (is_staff());
CREATE POLICY p_sesi_update ON sesi_ibadah FOR UPDATE USING (is_staff() AND lihat_sesi(id)) WITH CHECK (is_staff());
CREATE POLICY p_sesi_delete ON sesi_ibadah FOR DELETE USING (is_staff() AND lihat_sesi(id));

CREATE POLICY p_pecahan_select ON sesi_pecahan FOR SELECT USING (auth.role() = 'authenticated' AND lihat_sesi(sesi_id));
CREATE POLICY p_pecahan_manage ON sesi_pecahan FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- Persembahan: bendahara hanya boleh untuk kas yang ia akses (baca & tulis).
CREATE POLICY p_persembahan_select ON persembahan FOR SELECT USING (auth.role() = 'authenticated' AND lihat_kas(kas_id));
CREATE POLICY p_persembahan_manage ON persembahan FOR ALL
  USING (punya_akses_kas(kas_id)) WITH CHECK (punya_akses_kas(kas_id));

-- Pengeluaran: ajukan (insert) utk kas yang diakses; ACC (update) oleh approver.
-- Lihat: kas yang diakses, atau pengeluaran yang diajukan sendiri (mis. saat
-- kas-nya direvisi belakangan, pengaju tetap bisa lihat status pengajuannya).
CREATE POLICY p_pengeluaran_select ON pengeluaran FOR SELECT USING (
  auth.role() = 'authenticated' AND (lihat_kas(kas_id) OR diajukan_oleh = auth.uid())
);
CREATE POLICY p_pengeluaran_insert ON pengeluaran FOR INSERT WITH CHECK (punya_akses_kas(kas_id));
CREATE POLICY p_pengeluaran_update ON pengeluaran FOR UPDATE
  USING (boleh_approve() OR diajukan_oleh = auth.uid());
CREATE POLICY p_pengeluaran_delete ON pengeluaran FOR DELETE USING (boleh_approve());

CREATE POLICY p_anggaran_select ON anggaran FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY p_anggaran_manage ON anggaran FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- Jurnal otomatis: bendahara hanya lihat entri dari kas yg ia akses; entri
-- manual hanya yg ia catat sendiri. Tulis (manual) tetap is_staff().
CREATE POLICY p_jurnal_select ON jurnal_umum FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    (sumber = 'manual' AND dicatat_oleh = auth.uid()) OR lihat_jurnal(sumber, sumber_id)
  )
);
CREATE POLICY p_jurnal_manage ON jurnal_umum FOR ALL USING (is_staff()) WITH CHECK (is_staff());
CREATE POLICY p_jurnald_select ON jurnal_umum_detail FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jurnal_umum j WHERE j.id = jurnal_id
    AND ((j.sumber = 'manual' AND j.dicatat_oleh = auth.uid()) OR lihat_jurnal(j.sumber, j.sumber_id))
  )
);
CREATE POLICY p_jurnald_manage ON jurnal_umum_detail FOR ALL USING (is_staff()) WITH CHECK (is_staff());

CREATE POLICY p_logbackup_super ON log_backup FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());
CREATE POLICY p_logrestore_super ON log_restore FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- ============================================================
-- SELESAI. Setelah dijalankan, buat user pertama via
-- Authentication → Users, lalu jadikan admin & super admin:
--   UPDATE profiles SET role='admin', is_super_admin=true WHERE id='<USER_ID>';
-- Beri izin ACC pengeluaran ke majelis tertentu:
--   UPDATE profiles SET boleh_approve_pengeluaran=true WHERE id='<USER_ID>';
-- Beri akses kas ke bendahara:
--   INSERT INTO kas_akses (kas_id, user_id) VALUES ('<KAS_ID>','<USER_ID>');
-- ============================================================
