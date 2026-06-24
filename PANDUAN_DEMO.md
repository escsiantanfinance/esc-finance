# Panduan Demo — ESC Siantan Finance
**Untuk presentasi ke pembeli · Sabtu, 27 Juni 2026**

Situs live: **https://project-escfinance.vercel.app**
Akun demo: **escsiantanfinance@gmail.com** · kata sandi: _(yang Anda set di Supabase)_

---

## 0. Persiapan (lakukan SEBELUM hari‑H, ±10 menit)

Jalankan berurutan di **Supabase → SQL Editor** (sekali saja):

1. **`supabase/schema.sql`** — kalau database belum pernah diisi struktur. (Kalau sudah, lewati.)
2. **`supabase/demo_seed.sql`** — isi data contoh (8 jemaat, 3 sesi ibadah, persembahan, perpuluhan, pengeluaran, anggaran). Aman, otomatis dilewati kalau sudah ada data.
3. **Jadikan akun demo admin penuh** supaya semua menu muncul:
   ```sql
   update public.profiles p
   set role = 'admin', is_super_admin = true
   from auth.users u
   where u.id = p.id and u.email = 'escsiantanfinance@gmail.com';
   ```

Lalu **buka https://project-escfinance.vercel.app, login, pastikan Dashboard tampil berisi angka.** Kalau angka muncul → siap demo.

> Tips: buka pakai jendela **Incognito** saat hari‑H supaya bersih dari sesi lama. Siapkan juga koneksi internet cadangan (hotspot HP).

---

## 1. Alur demo (urutan yang disarankan, ±15–20 menit)

### A. Login & Keamanan _(30 dtk)_
- Buka situs → otomatis diarahkan ke halaman **Login** (tunjukkan: tanpa login tidak bisa masuk ke mana‑mana).
- Login. Tekankan: **setiap halaman terproteksi**, hak akses beda per peran (bendahara/majelis/admin/volunteer).

### B. Dashboard _(2 mnt)_ — "gambaran sekejap"
- Tunjuk kartu: **Total Saldo seluruh kas**, **Pemasukan bulan ini**, **Pengeluaran bulan ini**, **Pengeluaran menunggu persetujuan (1)**.
- Pesan jualan: _"Bendahara langsung tahu posisi keuangan tanpa buka Excel."_

### C. Sesi Ibadah _(3–4 mnt)_ — **fitur unggulan**
- Buka menu **Sesi Ibadah** → ada 3 sesi.
- Klik sesi **14 Juni 2026** (status _Terkunci_): tunjukkan
  - **Rincian pecahan uang** (berapa lembar 100rb, 50rb, dst → total fisik),
  - **Rincian per kategori** persembahan,
  - indikator **COCOK (MATCH)** antara uang fisik vs kategori,
  - **tanda tangan Gembala & Saksi** + status **terkunci** (tidak bisa diubah lagi).
- Klik sesi **21 Juni 2026** (status _Balanced_): sudah seimbang, **menunggu tanda tangan** — tunjukkan alur belum selesai.
- Pesan jualan: _"Rekonsiliasi kas pasca‑ibadah jadi rapi, transparan, dan tidak bisa dimanipulasi setelah ditandatangani."_

### D. Perpuluhan Volunteer _(2 mnt)_ — pembeda dari aplikasi lain
- Buka menu **Perpuluhan**.
- Tunjukkan **daftar centang**: bulan Juni — Budi, Siti, Andreas, Maria, Yohanes = **Sudah**; Ruth, Daniel, Ester = **Belum**.
- Pesan jualan: _"Begitu anggota memasukkan perpuluhannya, sistem otomatis menandai 'Sudah'. Volunteer/majelis tinggal menindaklanjuti yang belum."_

### E. Persembahan & Pengeluaran _(2 mnt)_
- **Persembahan**: daftar transaksi, tombol **Export Excel** (klik → file .xlsx terunduh).
- **Pengeluaran**: tunjukkan transaksi disetujui + **1 yang masih _Pending_** → alur **persetujuan** bendahara.

### F. Akun & Kas _(2 mnt)_ — fleksibilitas
- Buka **Akun/Kas**: 3 kas (Kas Gereja, Rekening Bank, Kas Diakonia) dengan **saldo real‑time**.
- Tunjukkan tombol **Tambah Kas** → _"Admin bisa menambah jenis kas/dompet sendiri."_

### G. Jurnal Umum & Laporan _(3 mnt)_ — kekuatan akuntansi
- **Jurnal Umum**: tunjukkan bahwa setiap persembahan & pengeluaran **otomatis tercatat double‑entry** (Debit/Kredit) — bendahara tidak perlu paham jurnal.
- **Laporan** → 3 tab:
  - **Laporan Aktivitas** (pemasukan vs beban, surplus/defisit),
  - **Neraca** (aset/kewajiban/dana),
  - **Arus Kas** (kas masuk/keluar per kas).
- Tunjukkan **Export Excel** di laporan.
- Pesan jualan: _"Tiga laporan keuangan standar muncul otomatis dari satu sumber data — siap untuk rapat majelis / audit."_

### H. Anggaran _(1 mnt)_
- **Anggaran**: bandingkan **dianggarkan vs realisasi** (mis. Pemeliharaan Gedung dianggarkan 3 jt, realisasi 3,5 jt → terlihat over budget).

### I. Backup & Recovery _(1 mnt)_ — ketenangan data
- Buka **Backup** (khusus super‑admin): tunjukkan **tombol pencadangan**, **log backup**, dan kemampuan **restore dari Excel**. Backup juga **otomatis terjadwal harian**.

### J. Aplikasi Mobile _(1 mnt)_
- Tunjukkan **tangkapan layar mobile** di `docs/UI_Mobile_Aplikasi.png` (atau jalankan APK bila sudah dibangun).
- Pesan jualan: _"Penghitungan uang & tanda tangan dilakukan langsung dari HP saat di gereja, lalu tersinkron ke web."_

---

## 2. Ringkasan nilai jual (kalau ditanya "kenapa harus beli ini?")

1. **Lengkap**: web (admin/bendahara) + mobile (lapangan) + database aman — satu paket.
2. **Anti‑selisih**: rekonsiliasi pecahan uang vs kategori, dengan tanda tangan & penguncian data.
3. **Akuntansi otomatis**: 3 laporan keuangan standar tanpa perlu ahli akuntansi.
4. **Akuntabilitas perpuluhan**: pelacakan otomatis siapa sudah/belum.
5. **Aman & tahan bencana**: hak akses berlapis + backup terenkripsi otomatis.

---

## 3. Kalau ada yang error saat demo

| Gejala | Tindakan cepat |
|---|---|
| Halaman kosong / angka 0 | Pastikan `demo_seed.sql` sudah dijalankan; refresh. |
| Menu Jurnal/Backup tidak muncul | Jalankan SQL promosi admin di langkah 0.3, lalu **logout‑login**. |
| Tidak bisa login | Buka Incognito; pastikan kata sandi benar (reset di Supabase → Authentication bila perlu). |
| Situs tidak terbuka | Cek internet; coba URL cadangan deployment di dashboard Vercel. |

> Detail teknis lengkap ada di `PANDUAN_SISTEM.md` & `SETUP_GUIDE.md` (versi PDF di folder `docs/`).
