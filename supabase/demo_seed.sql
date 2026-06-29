-- ============================================================
-- ESC SIANTAN FINANCE — DATA CONTOH UNTUK DEMO (v3.0 multi-kas)
-- ------------------------------------------------------------
-- Jalankan SETELAH schema.sql berhasil, di Supabase SQL Editor.
-- Mengisi: jemaat/volunteer, 3 sesi ibadah (2 terkunci + 1 balanced),
-- persembahan per kategori, perpuluhan per anggota, 1 "Kartu Biru"
-- (pengeluaran tunai dalam sesi), pengeluaran biasa (termasuk 1 pending),
-- anggaran, dan saldo awal kas. Semua jurnal & saldo terisi OTOMATIS
-- lewat trigger — Anda tidak perlu menyentuh jurnal_umum.
--
-- AMAN: otomatis dilewati jika sudah ada data (anti-dobel).
-- Untuk reset & isi ulang, jalankan dulu:
--   TRUNCATE persembahan, pengeluaran, sesi_pecahan, sesi_ibadah,
--            jurnal_umum, jurnal_umum_detail, anggaran, anggota RESTART IDENTITY CASCADE;
-- lalu jalankan file ini lagi.
-- ============================================================
DO $$
DECLARE
  v_prof uuid;
  v_induk uuid; v_pk uuid; v_asuh uuid; v_reno uuid; v_jiman uuid;
  s1 uuid; s2 uuid; s3 uuid;
  a1 uuid; a2 uuid; a3 uuid; a4 uuid; a5 uuid; a6 uuid; a7 uuid; a8 uuid;
BEGIN
  IF (SELECT COUNT(*) FROM persembahan) > 0 OR (SELECT COUNT(*) FROM anggota) > 0 THEN
    RAISE NOTICE 'Data contoh sudah ada — seed dilewati. (Lihat catatan TRUNCATE di atas untuk isi ulang.)';
    RETURN;
  END IF;

  SELECT id INTO v_prof  FROM profiles ORDER BY created_at LIMIT 1;
  SELECT id INTO v_induk FROM kas WHERE nama = 'EO - Induk';
  SELECT id INTO v_pk    FROM kas WHERE nama = 'PK';
  SELECT id INTO v_asuh  FROM kas WHERE nama = 'Anak Asuh';
  SELECT id INTO v_reno  FROM kas WHERE nama = 'Pembangunan - Perehapan';
  SELECT id INTO v_jiman FROM kas WHERE nama = 'Pembangunan - Janji Iman';

  -- ---- Saldo awal (opening balance) ----
  UPDATE kas SET saldo_awal = 8000000  WHERE id = v_induk;
  UPDATE kas SET saldo_awal = 3000000  WHERE id = v_pk;
  UPDATE kas SET saldo_awal = 2000000  WHERE id = v_asuh;
  UPDATE kas SET saldo_awal = 15000000 WHERE id = v_reno;

  -- ---- Jemaat & Volunteer (daftar perpuluhan) ----
  INSERT INTO anggota (nama, kontak, divisi_pelayanan, is_volunteer, wajib_perpuluhan) VALUES
    ('Budi Santoso',      '0812-1100-2201', 'Worship & Musik',   true,  true) RETURNING id INTO a1;
  INSERT INTO anggota (nama, kontak, divisi_pelayanan, is_volunteer, wajib_perpuluhan) VALUES
    ('Siti Marlina',      '0813-2200-3302', 'Multimedia',         true,  true) RETURNING id INTO a2;
  INSERT INTO anggota (nama, kontak, divisi_pelayanan, is_volunteer, wajib_perpuluhan) VALUES
    ('Andreas Tanjung',   '0852-3300-4403', 'Usher & Penyambut',  true,  true) RETURNING id INTO a3;
  INSERT INTO anggota (nama, kontak, divisi_pelayanan, is_volunteer, wajib_perpuluhan) VALUES
    ('Maria Sinaga',      '0821-4400-5504', 'Paduan Suara',       true,  true) RETURNING id INTO a4;
  INSERT INTO anggota (nama, kontak, divisi_pelayanan, is_volunteer, wajib_perpuluhan) VALUES
    ('Yohanes Pakpahan',  '0856-5500-6605', 'Pemusik',            true,  true) RETURNING id INTO a5;
  INSERT INTO anggota (nama, kontak, divisi_pelayanan, is_volunteer, wajib_perpuluhan) VALUES
    ('Ruth Hutapea',      '0877-6600-7706', 'Doa Syafaat',        false, true) RETURNING id INTO a6;
  INSERT INTO anggota (nama, kontak, divisi_pelayanan, is_volunteer, wajib_perpuluhan) VALUES
    ('Daniel Sirait',     '0813-7700-8807', 'Jemaat',             false, true) RETURNING id INTO a7;
  INSERT INTO anggota (nama, kontak, divisi_pelayanan, is_volunteer, wajib_perpuluhan) VALUES
    ('Ester Simanjuntak', '0812-8800-9908', 'Jemaat',             false, true) RETURNING id INTO a8;

  -- ============================================================
  -- SESI 1 — Minggu, 24 Mei 2026 (TERKUNCI / sudah ditandatangani)
  -- ============================================================
  INSERT INTO sesi_ibadah (nama_sesi, jenis_ibadah, tanggal, jam, ibadah_ke, kas_id, status, dibuka_oleh,
                           nama_gembala, nama_bendahara, nama_penghitung1, nama_penghitung2)
    VALUES ('Persembahan Pagi','Ibadah Raya Minggu','2026-05-24','09:00',1,v_induk,'balanced',v_prof,
            'Pdt. Markus Hutahaean','Achiang','Ferlianty','Endang')
    RETURNING id INTO s1;
  INSERT INTO sesi_pecahan (sesi_id, nominal, jumlah_lembar) VALUES
    (s1,100000,25),(s1,50000,20),(s1,20000,15),(s1,10000,20);   -- = 4.000.000
  INSERT INTO persembahan (tanggal, kategori_id, jumlah, sesi_id, dicatat_oleh, keterangan) VALUES
    ('2026-05-24',(SELECT id FROM kategori_persembahan WHERE nama='Ibadah Raya'),   2200000, s1, v_prof, 'Persembahan ibadah raya'),
    ('2026-05-24',(SELECT id FROM kategori_persembahan WHERE nama='Kolekte'),        900000, s1, v_prof, 'Kolekte'),
    ('2026-05-24',(SELECT id FROM kategori_persembahan WHERE nama='Janji Iman'),     500000, s1, v_prof, 'Janji iman'),
    ('2026-05-24',(SELECT id FROM kategori_persembahan WHERE nama='Ucapan Syukur'),  400000, s1, v_prof, 'Persembahan syukur');  -- = 4.000.000 (MATCH)
  UPDATE sesi_ibadah SET status='signed_locked', signed_at='2026-05-24 12:15+07' WHERE id = s1;

  -- ============================================================
  -- SESI 2 — Minggu, 14 Juni 2026 (TERKUNCI) + KARTU BIRU
  -- Demo alur baru: pengeluaran tunai langsung mengurangi fisik.
  --   fisik (4.900.000) = Σ kategori (5.500.000) − Σ kartu biru (600.000)
  -- ============================================================
  INSERT INTO sesi_ibadah (nama_sesi, jenis_ibadah, tanggal, jam, ibadah_ke, kas_id, status, dibuka_oleh,
                           nama_gembala, nama_bendahara, nama_penghitung1, nama_penghitung2)
    VALUES ('Persembahan Pagi','Ibadah Raya Minggu','2026-06-14','09:00',1,v_induk,'balanced',v_prof,
            'Pdt. Markus Hutahaean','Achiang','Ferlianty','Endang')
    RETURNING id INTO s2;
  INSERT INTO sesi_pecahan (sesi_id, nominal, jumlah_lembar) VALUES
    (s2,100000,35),(s2,50000,24),(s2,20000,10),(s2,5000,20);    -- = 4.900.000
  INSERT INTO persembahan (tanggal, kategori_id, jumlah, sesi_id, dicatat_oleh, keterangan) VALUES
    ('2026-06-14',(SELECT id FROM kategori_persembahan WHERE nama='Ibadah Raya'),   3000000, s2, v_prof, 'Persembahan ibadah raya'),
    ('2026-06-14',(SELECT id FROM kategori_persembahan WHERE nama='Kolekte'),       1500000, s2, v_prof, 'Kolekte'),
    ('2026-06-14',(SELECT id FROM kategori_persembahan WHERE nama='Janji Iman'),     700000, s2, v_prof, 'Janji iman'),
    ('2026-06-14',(SELECT id FROM kategori_persembahan WHERE nama='Ucapan Syukur'),  300000, s2, v_prof, 'Persembahan syukur');  -- = 5.500.000
  -- Kartu Biru (pengeluaran tunai dalam sesi, sudah disetujui)
  INSERT INTO pengeluaran (tanggal, kategori_id, kas_id, sesi_id, jumlah, keterangan, penerima, status, diajukan_oleh, disetujui_oleh, disetujui_pada) VALUES
    ('2026-06-14',(SELECT id FROM kategori_pengeluaran WHERE nama='Operasional'), v_induk, s2, 550000, 'Keperluan bersih gereja','Amanda','disetujui',v_prof,v_prof,'2026-06-14 12:00+07'),
    ('2026-06-14',(SELECT id FROM kategori_pengeluaran WHERE nama='Administrasi'), v_induk, s2,  50000, 'Pembelian kertas A4 (1 rim)','Melsin','disetujui',v_prof,v_prof,'2026-06-14 12:00+07');
  UPDATE sesi_ibadah SET status='signed_locked', signed_at='2026-06-14 12:10+07' WHERE id = s2;

  -- ============================================================
  -- SESI 3 — Minggu, 21 Juni 2026 (BALANCED / menunggu tanda tangan)
  -- Sengaja dibiarkan belum terkunci untuk demo alur penandatanganan.
  -- ============================================================
  INSERT INTO sesi_ibadah (nama_sesi, jenis_ibadah, tanggal, jam, ibadah_ke, kas_id, status, dibuka_oleh)
    VALUES ('Persembahan Pagi','Ibadah Raya Minggu','2026-06-21','09:00',1,v_induk,'balanced',v_prof)
    RETURNING id INTO s3;
  INSERT INTO sesi_pecahan (sesi_id, nominal, jumlah_lembar) VALUES
    (s3,100000,30),(s3,50000,18),(s3,20000,20),(s3,10000,20);   -- = 4.500.000
  INSERT INTO persembahan (tanggal, kategori_id, jumlah, sesi_id, dicatat_oleh, keterangan) VALUES
    ('2026-06-21',(SELECT id FROM kategori_persembahan WHERE nama='Ibadah Raya'), 2500000, s3, v_prof, 'Persembahan ibadah raya'),
    ('2026-06-21',(SELECT id FROM kategori_persembahan WHERE nama='Kolekte'),     1300000, s3, v_prof, 'Kolekte'),
    ('2026-06-21',(SELECT id FROM kategori_persembahan WHERE nama='Janji Iman'),   700000, s3, v_prof, 'Janji iman');  -- = 4.500.000 (MATCH, siap ttd)

  -- ============================================================
  -- PERPULUHAN PER ANGGOTA (kategori Persepuluhan → kas PK; di luar sesi)
  -- Inilah yang membuat checklist perpuluhan otomatis tercentang "Sudah".
  -- ============================================================
  -- Mei 2026: 6 dari 8 mengembalikan
  INSERT INTO persembahan (tanggal, kategori_id, jumlah, anggota_id, nama_pemberi, dicatat_oleh, keterangan) VALUES
    ('2026-05-10',(SELECT id FROM kategori_persembahan WHERE nama='Persepuluhan'), 500000, a1, 'Budi Santoso',     v_prof, 'Perpuluhan Mei'),
    ('2026-05-10',(SELECT id FROM kategori_persembahan WHERE nama='Persepuluhan'), 350000, a2, 'Siti Marlina',     v_prof, 'Perpuluhan Mei'),
    ('2026-05-11',(SELECT id FROM kategori_persembahan WHERE nama='Persepuluhan'), 300000, a3, 'Andreas Tanjung',  v_prof, 'Perpuluhan Mei'),
    ('2026-05-11',(SELECT id FROM kategori_persembahan WHERE nama='Persepuluhan'), 600000, a4, 'Maria Sinaga',     v_prof, 'Perpuluhan Mei'),
    ('2026-05-12',(SELECT id FROM kategori_persembahan WHERE nama='Persepuluhan'), 250000, a5, 'Yohanes Pakpahan', v_prof, 'Perpuluhan Mei'),
    ('2026-05-12',(SELECT id FROM kategori_persembahan WHERE nama='Persepuluhan'), 400000, a6, 'Ruth Hutapea',     v_prof, 'Perpuluhan Mei');
  -- Juni 2026: baru 5 dari 8 mengembalikan (a6, a7, a8 masih "Belum")
  INSERT INTO persembahan (tanggal, kategori_id, jumlah, anggota_id, nama_pemberi, dicatat_oleh, keterangan) VALUES
    ('2026-06-08',(SELECT id FROM kategori_persembahan WHERE nama='Persepuluhan'), 500000, a1, 'Budi Santoso',     v_prof, 'Perpuluhan Juni'),
    ('2026-06-08',(SELECT id FROM kategori_persembahan WHERE nama='Persepuluhan'), 350000, a2, 'Siti Marlina',     v_prof, 'Perpuluhan Juni'),
    ('2026-06-09',(SELECT id FROM kategori_persembahan WHERE nama='Persepuluhan'), 300000, a3, 'Andreas Tanjung',  v_prof, 'Perpuluhan Juni'),
    ('2026-06-10',(SELECT id FROM kategori_persembahan WHERE nama='Persepuluhan'), 600000, a4, 'Maria Sinaga',     v_prof, 'Perpuluhan Juni'),
    ('2026-06-10',(SELECT id FROM kategori_persembahan WHERE nama='Persepuluhan'), 250000, a5, 'Yohanes Pakpahan', v_prof, 'Perpuluhan Juni');

  -- Persembahan khusus Anak Asuh (kategori Anak Asuh → kas Anak Asuh)
  INSERT INTO persembahan (tanggal, kategori_id, jumlah, dicatat_oleh, nama_pemberi, keterangan) VALUES
    ('2026-06-14',(SELECT id FROM kategori_persembahan WHERE nama='Anak Asuh'), 380000, v_prof, 'Solihin / Stephani / Koajie', 'Persembahan anak asuh');

  -- ============================================================
  -- PENGELUARAN BIASA (status disetujui → otomatis posting & potong saldo)
  -- ============================================================
  INSERT INTO pengeluaran (tanggal, kategori_id, kas_id, jumlah, keterangan, penerima, status, diajukan_oleh, disetujui_oleh, disetujui_pada) VALUES
    ('2026-05-06',(SELECT id FROM kategori_pengeluaran WHERE nama='Operasional'),            v_induk, 800000, 'Tagihan listrik & air bulan April','PLN/PDAM','disetujui',v_prof,v_prof,'2026-05-06 10:00+07'),
    ('2026-05-20',(SELECT id FROM kategori_pengeluaran WHERE nama='Pelayanan'),              v_induk, 600000, 'Dekorasi & perlengkapan kebaktian','Toko Dekorasi','disetujui',v_prof,v_prof,'2026-05-20 10:00+07'),
    ('2026-06-03',(SELECT id FROM kategori_pengeluaran WHERE nama='Operasional'),            v_induk, 850000, 'Tagihan listrik, air & internet Mei','PLN/PDAM/ISP','disetujui',v_prof,v_prof,'2026-06-03 10:00+07'),
    ('2026-06-05',(SELECT id FROM kategori_pengeluaran WHERE nama='Pelayanan'),              v_induk, 1200000,'Sewa sound system & honor pemusik','Tim Musik','disetujui',v_prof,v_prof,'2026-06-05 10:00+07'),
    ('2026-06-08',(SELECT id FROM kategori_pengeluaran WHERE nama='Diakonia'),               v_asuh,  2000000,'Bantuan dana duka keluarga jemaat','Kel. Almh.','disetujui',v_prof,v_prof,'2026-06-08 14:00+07'),
    ('2026-06-12',(SELECT id FROM kategori_pengeluaran WHERE nama='Renovasi & Pemeliharaan'),v_reno,  3500000,'Perbaikan atap & plafon gedung gereja','CV Bangun Jaya','disetujui',v_prof,v_prof,'2026-06-12 11:00+07'),
    ('2026-06-15',(SELECT id FROM kategori_pengeluaran WHERE nama='Administrasi'),           v_induk, 300000, 'ATK & cetak warta jemaat','Toko ATK','disetujui',v_prof,v_prof,'2026-06-15 10:00+07');
  -- 1 pengeluaran PENDING (demo alur persetujuan oleh Majelis/Super Admin)
  INSERT INTO pengeluaran (tanggal, kategori_id, kas_id, jumlah, keterangan, penerima, status, diajukan_oleh) VALUES
    ('2026-06-20',(SELECT id FROM kategori_pengeluaran WHERE nama='Pendidikan & Pelatihan'), v_induk, 750000, 'Seminar pelatihan musik gereja','Panitia Seminar','pending',v_prof);

  -- ============================================================
  -- ANGGARAN Juni 2026 (untuk Laporan Anggaran vs Realisasi)
  -- ============================================================
  INSERT INTO anggaran (tahun, bulan, kategori_id, nama_pos, jumlah_dianggarkan, periode, dibuat_oleh, disetujui) VALUES
    (2026,6,(SELECT id FROM kategori_pengeluaran WHERE nama='Operasional'),             'Operasional Bulanan',     1000000,'bulanan',v_prof,true),
    (2026,6,(SELECT id FROM kategori_pengeluaran WHERE nama='Pelayanan'),               'Pelayanan & Ibadah',      1500000,'bulanan',v_prof,true),
    (2026,6,(SELECT id FROM kategori_pengeluaran WHERE nama='Diakonia'),                'Dana Diakonia',           2500000,'bulanan',v_prof,true),
    (2026,6,(SELECT id FROM kategori_pengeluaran WHERE nama='Renovasi & Pemeliharaan'), 'Pemeliharaan Gedung',     3000000,'bulanan',v_prof,true),
    (2026,6,(SELECT id FROM kategori_pengeluaran WHERE nama='Misi & Penginjilan'),      'Misi & Penginjilan',      2000000,'bulanan',v_prof,true),
    (2026,6,(SELECT id FROM kategori_pengeluaran WHERE nama='Administrasi'),            'Administrasi',             500000,'bulanan',v_prof,true);

  -- ---- Pastikan saldo kas konsisten ----
  PERFORM recalc_saldo_kas(v_induk);
  PERFORM recalc_saldo_kas(v_pk);
  PERFORM recalc_saldo_kas(v_asuh);
  PERFORM recalc_saldo_kas(v_reno);
  PERFORM recalc_saldo_kas(v_jiman);

  RAISE NOTICE 'Data contoh berhasil dibuat: 8 anggota, 3 sesi ibadah, % persembahan, pengeluaran + kartu biru, 6 anggaran.',
    (SELECT COUNT(*) FROM persembahan);
END $$;
