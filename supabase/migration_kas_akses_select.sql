-- ============================================================
-- MIGRASI: Pembatasan LIHAT data per kas untuk Bendahara
-- ------------------------------------------------------------
-- AMAN dijalankan di database yang sudah berisi data — TIDAK ADA
-- DROP TABLE. Hanya menambah fungsi & mengganti beberapa POLICY
-- RLS (select) + 1 VIEW. Jalankan SEKALI di Supabase SQL Editor.
--
-- Sebelum migrasi ini: kas_akses sudah membatasi TULIS (insert/update)
-- persembahan & pengeluaran per kas, tapi SELECT (baca/lihat) masih
-- terbuka untuk semua user terautentikasi — artinya bendahara bisa
-- INPUT hanya ke kas miliknya, tapi masih bisa MELIHAT semua kas,
-- semua sesi, semua persembahan & pengeluaran gereja. Migrasi ini
-- menutup celah itu: bendahara sekarang hanya LIHAT data dari kas
-- yang diberi akses padanya (Admin/Super Admin/Majelis tidak berubah,
-- tetap lihat semua).
-- ============================================================

-- ---------- FUNGSI BARU ----------

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

-- ---------- KAS ----------
DROP POLICY IF EXISTS p_kas_select ON kas;
CREATE POLICY p_kas_select ON kas FOR SELECT USING (auth.role() = 'authenticated' AND lihat_kas(id));

-- ---------- PERSEMBAHAN ----------
DROP POLICY IF EXISTS p_persembahan_select ON persembahan;
CREATE POLICY p_persembahan_select ON persembahan FOR SELECT USING (auth.role() = 'authenticated' AND lihat_kas(kas_id));

-- ---------- PENGELUARAN ----------
DROP POLICY IF EXISTS p_pengeluaran_select ON pengeluaran;
CREATE POLICY p_pengeluaran_select ON pengeluaran FOR SELECT USING (
  auth.role() = 'authenticated' AND (lihat_kas(kas_id) OR diajukan_oleh = auth.uid())
);

-- ---------- SESI IBADAH (pecah jadi select/insert/update/delete) ----------
DROP POLICY IF EXISTS p_sesi_select ON sesi_ibadah;
DROP POLICY IF EXISTS p_sesi_manage ON sesi_ibadah;
CREATE POLICY p_sesi_select ON sesi_ibadah FOR SELECT USING (auth.role() = 'authenticated' AND lihat_sesi(id));
CREATE POLICY p_sesi_insert ON sesi_ibadah FOR INSERT WITH CHECK (is_staff());
CREATE POLICY p_sesi_update ON sesi_ibadah FOR UPDATE USING (is_staff() AND lihat_sesi(id)) WITH CHECK (is_staff());
CREATE POLICY p_sesi_delete ON sesi_ibadah FOR DELETE USING (is_staff() AND lihat_sesi(id));

-- ---------- SESI PECAHAN (denominasi) ----------
DROP POLICY IF EXISTS p_pecahan_select ON sesi_pecahan;
CREATE POLICY p_pecahan_select ON sesi_pecahan FOR SELECT USING (auth.role() = 'authenticated' AND lihat_sesi(sesi_id));

-- ---------- JURNAL UMUM (+ detail) ----------
DROP POLICY IF EXISTS p_jurnal_select ON jurnal_umum;
CREATE POLICY p_jurnal_select ON jurnal_umum FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    (sumber = 'manual' AND dicatat_oleh = auth.uid()) OR lihat_jurnal(sumber, sumber_id)
  )
);
DROP POLICY IF EXISTS p_jurnald_select ON jurnal_umum_detail;
CREATE POLICY p_jurnald_select ON jurnal_umum_detail FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jurnal_umum j WHERE j.id = jurnal_id
    AND ((j.sumber = 'manual' AND j.dicatat_oleh = auth.uid()) OR lihat_jurnal(j.sumber, j.sumber_id))
  )
);

-- ---------- v_status_perpuluhan: tetap whole-church (oversight) ----------
-- Pakai fungsi SECURITY DEFINER supaya checklist Perpuluhan tidak ikut
-- terpotong oleh pembatasan kas di atas (tracking perpuluhan memang
-- lintas-kas, bukan urusan custody satu bendahara).
CREATE OR REPLACE VIEW v_status_perpuluhan AS
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
-- SELESAI. Verifikasi cepat (jalankan terpisah, login sbg bendahara
-- demo dengan akses terbatas):
--   SELECT count(*) FROM kas;            -- harus < total kas asli
--   SELECT count(*) FROM sesi_ibadah;    -- hanya sesi kas miliknya
--   SELECT count(*) FROM persembahan;    -- hanya kas miliknya
-- Login sbg admin/super admin: semua angka di atas harus tetap penuh.
-- ============================================================
