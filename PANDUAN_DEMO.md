# Panduan Demo — ESC Siantan Finance v3.0
**Untuk presentasi ke pembeli**

Situs live: **https://project-escfinance.vercel.app**
Akun demo: **escsiantanfinance@gmail.com** · kata sandi: _(yang Anda set di Supabase)_

---

## 0. Persiapan (lakukan SEBELUM hari‑H, ±15 menit)

Jalankan berurutan di **Supabase → SQL Editor** (sekali saja, kalau belum):

1. **`supabase/schema.sql`** — bangun struktur + 15 kas + 11 kategori persembahan. (Kalau sudah, lewati.)
2. **`supabase/storage_setup.sql`** — bucket tanda tangan/nota. **Wajib**, tanpa ini tanda tangan gagal terunggah.
3. **`supabase/demo_seed.sql`** — isi data contoh (8 jemaat, 3 sesi ibadah, persembahan per kategori, 1 "Kartu Biru", pengeluaran, anggaran). Aman, otomatis dilewati kalau sudah ada data.
4. **Jadikan akun demo Super Admin penuh**:
   ```sql
   update public.profiles p
   set role = 'admin', is_super_admin = true, boleh_approve_pengeluaran = true
   from auth.users u
   where u.id = p.id and u.email = 'escsiantanfinance@gmail.com';
   ```
5. **(Opsional, kuat disarankan)** Supaya bisa mendemokan "akses kas terbatas" & "izin approve majelis", buat 1 akun tambahan via **Authentication → Users** (mis. `bendahara-demo@...`), lalu:
   ```sql
   -- jadikan bendahara biasa
   update public.profiles set role = 'bendahara' where id = '<USER_ID_BENDAHARA>';
   -- beri akses hanya ke 2 kas (contoh)
   insert into kas_akses (kas_id, user_id) values
     ((select id from kas where nama = 'EO - Induk'), '<USER_ID_BENDAHARA>'),
     ((select id from kas where nama = 'PK'),         '<USER_ID_BENDAHARA>');
   ```

Lalu **buka https://project-escfinance.vercel.app, login, pastikan Dashboard tampil berisi angka.** Kalau angka muncul → siap demo.

> Tips: buka pakai jendela **Incognito** saat hari‑H supaya bersih dari sesi lama. Siapkan juga koneksi internet cadangan (hotspot HP), dan instal `app-debug.apk` (mobile) di HP demo sebelumnya — lihat §4 di bawah.

---

## 1. Alur demo (urutan yang disarankan, ±20–25 menit)

### A. Login & Keamanan _(30 dtk)_
- Buka situs → otomatis diarahkan ke halaman **Login**.
- Login. Tekankan: **setiap halaman terproteksi**, hak akses beda per peran (bendahara/majelis/admin/Super Admin) **dan per kas** — bendahara hanya melihat/mengisi kas yang ditugaskan padanya.

### B. Dashboard _(1–2 mnt)_ — "gambaran sekejap"
- Tunjuk kartu: **Total Saldo seluruh kas** (sekarang merangkum 15 kas), **Pemasukan bulan ini**, **Pengeluaran bulan ini**, **Pengeluaran menunggu persetujuan**.
- Pesan jualan: _"Walau kasnya banyak dan dipegang orang berbeda‑beda, pemilik tetap punya satu gambaran utuh."_

### C. Kategori Persembahan _(2–3 mnt)_ — **fitur baru, pembeda utama**
- Buka menu **Kategori** (khusus Super Admin).
- Tunjukkan daftar kategori: **Ibadah Raya, Persepuluhan, Ucapan Syukur, Buah Sulung, Pembangunan Gedung, Perehapan, Janji Iman, Anak Asuh, Diakonia, Kolekte, Lainnya** — tiap kategori punya **kas tujuan** sendiri.
- Klik salah satu (mis. **Persepuluhan**) → tunjukkan kas tujuannya (Kas PK) dan flag **"butuh nama pemberi"** menyala.
- Pesan jualan: _"Gereja bebas menambah/mengubah kategori dan menentukan ke kas mana uangnya masuk — tanpa sentuh kode, tanpa minta developer."_

### D. Pengguna & Akses Kas _(2 mnt)_ — **fitur baru**
- Buka menu **Pengguna**.
- Tunjukkan: ubah role, **toggle izin approve pengeluaran** (untuk majelis tertentu), dan **modal atur akses kas** per bendahara (centang kas mana yang boleh ia pegang).
- Pesan jualan: _"15 kas, banyak pemegang — Super Admin yang menentukan siapa boleh pegang kas apa. Bendahara tidak akan pernah salah pegang kas orang lain."_

### E. Sesi Ibadah _(4–5 mnt)_ — **fitur unggulan, sudah dirombak**
- Buka menu **Sesi Ibadah** → ada 3 sesi, masing‑masing dengan **nama custom** ("Persembahan Pagi").
- Klik sesi **14 Juni 2026** (status _Terkunci_): tunjukkan
  - **Rincian pecahan uang** (lembar 100rb, 50rb, dst → total fisik),
  - **Rincian per kategori** persembahan (tiap kategori bisa ke kas berbeda),
  - **Kartu Biru** — pengeluaran tunai langsung dari hitungan (beli kertas, kebersihan) yang ikut diperhitungkan,
  - indikator **COCOK (MATCH)**: fisik = kategori − kartu biru,
  - **4 tanda tangan**: Penghitung 1, Penghitung 2, Bendahara, Gembala + status **terkunci**.
- Klik sesi **21 Juni 2026** (status _Balanced_): sudah seimbang, **menunggu tanda tangan** — tunjukkan alur belum selesai.
- Pesan jualan: _"Rekonsiliasi kas pasca‑ibadah jadi rapi, transparan, dan tidak bisa dimanipulasi setelah ditandatangani 4 pihak."_

### F. Perpuluhan Volunteer _(2 mnt)_ — pembeda dari aplikasi lain
- Buka menu **Perpuluhan**.
- Tunjukkan **daftar centang**: bulan Juni — Budi, Siti, Andreas, Maria, Yohanes = **Sudah**; Ruth, Daniel, Ester = **Belum**.
- Pesan jualan: _"Begitu seseorang memasukkan perpuluhannya lewat kategori Persepuluhan, sistem otomatis menandai 'Sudah'. Majelis tinggal menindaklanjuti yang belum."_

### G. Persembahan & Pengeluaran _(2–3 mnt)_
- **Persembahan**: daftar transaksi per kategori + nama pemberi (untuk kategori yang butuh nama), tombol **Export Excel**.
- **Pengeluaran**: tunjukkan transaksi disetujui + **1 yang masih _Pending_** → alur **persetujuan**: jelaskan siapa saja yang bisa approve (Super Admin selalu, + majelis yang diberi izin di langkah D).

### H. Akun & Kas _(2 mnt)_ — skala besar
- Buka **Akun/Kas**: **15 kas** dengan **penanggung jawab** & saldo real‑time masing‑masing (sesuai struktur "Rekapan Saldo Kas" gereja).
- Tunjukkan tombol **Tambah Kas** → _"Super Admin bisa menambah/mengurangi jenis kas sendiri, kapan pun ada divisi/pelayanan baru."_

### I. Jurnal Umum & Laporan _(3 mnt)_ — kekuatan akuntansi
- **Jurnal Umum**: setiap persembahan & pengeluaran **otomatis tercatat double‑entry** (Debit/Kredit) — bendahara tidak perlu paham jurnal.
- **Laporan** → 3 tab: **Laporan Aktivitas**, **Neraca**, **Arus Kas** + **Export Excel**.
- Pesan jualan: _"Tiga laporan keuangan standar muncul otomatis dari satu sumber data, lintas 15 kas — siap untuk rapat majelis / audit."_

### J. Anggaran _(1 mnt)_
- **Anggaran**: bandingkan **dianggarkan vs realisasi** (mis. Pemeliharaan Gedung dianggarkan 3 jt, realisasi 3,5 jt → terlihat over budget).

### K. Backup & Recovery _(1 mnt)_ — ketenangan data
- Buka **Backup** (khusus Super Admin): tombol pencadangan, log backup, restore dari Excel. Backup juga **otomatis terjadwal harian**.

### L. Aplikasi Mobile _(2 mnt)_
- Buka aplikasi di HP demo (lihat §4 cara siapkan APK‑nya). Tunjukkan alur:
  **Buka sesi (beri nama) → kalkulator denominasi → centang & isi kategori → Kartu Biru (opsional) → 4 tanda tangan → kunci.**
- Pesan jualan: _"Penghitungan uang & tanda tangan dilakukan langsung dari HP saat di gereja, bendahara hanya melihat kas miliknya, lalu semuanya tersinkron ke web seketika."_

---

## 2. Ringkasan nilai jual v3.0 (kalau ditanya "kenapa harus beli ini?")

1. **Lengkap**: web (Super Admin/bendahara/majelis) + mobile (lapangan) + database aman — satu paket.
2. **Skala nyata**: dirancang untuk **banyak kas** (15+) dengan **banyak pemegang**, bukan cuma 1 bendahara tunggal.
3. **Fleksibel tanpa kode**: kategori persembahan & kas bisa diatur sendiri oleh Super Admin — termasuk ke kas mana uangnya mengalir.
4. **Kontrol akses berjenjang**: tiap bendahara hanya pegang kas yang ditugaskan; persetujuan pengeluaran bisa didelegasikan ke majelis tertentu.
5. **Anti‑selisih**: rekonsiliasi pecahan uang vs kategori (dikurangi pengeluaran tunai di tempat), dengan 4 tanda tangan & penguncian data.
6. **Akuntansi otomatis**: 3 laporan keuangan standar tanpa perlu ahli akuntansi.
7. **Akuntabilitas perpuluhan**: pelacakan otomatis siapa sudah/belum.
8. **Aman & tahan bencana**: hak akses berlapis + backup terenkripsi otomatis.

---

## 3. Kalau ada yang error saat demo

| Gejala | Tindakan cepat |
|---|---|
| Halaman kosong / angka 0 | Pastikan `demo_seed.sql` sudah dijalankan; refresh. |
| Menu Kategori/Pengguna/Jurnal/Backup tidak muncul | Jalankan SQL promosi Super Admin di langkah 0.4, lalu **logout‑login**. |
| Daftar kategori di mobile kosong | Bendahara belum diberi akses kas (`kas_akses`) — atur lewat menu Pengguna di web. |
| Tidak bisa login | Buka Incognito; pastikan kata sandi benar (reset di Supabase → Authentication bila perlu). |
| Situs tidak terbuka | Cek internet; coba URL cadangan deployment di dashboard Vercel. |

> Detail teknis lengkap ada di `PANDUAN_SISTEM.md` & `SETUP_GUIDE.md`.

---

## 4. Menyiapkan aplikasi mobile untuk demo

APK rilis (`--release`) belum bisa dibangun di mesin developer karena Windows
Smart App Control memblokir compiler internal Flutter (`gen_snapshot.exe`) —
ini batasan mesin developer, bukan bug aplikasi (`flutter analyze` bersih,
0 error). Untuk demo, dua opsi:

- **Opsi cepat**: pakai APK **debug** yang sudah terbukti jalan
  (`mobile/build/app/outputs/flutter-apk/app-debug.apk`, ~160MB). Fungsinya
  identik dengan rilis, hanya ukuran lebih besar & sedikit lebih lambat —
  cukup untuk demo langsung.
- **Opsi rapi (untuk dikirim ke pembeli)**: build release di komputer lain
  (atau setelah menyesuaikan Smart App Control), lalu jalankan
  `mobile/build_apk.ps1` seperti biasa.

Install ke HP: salin APK lewat kabel/USB atau unggah ke Google Drive →
unduh di HP → aktifkan **"Izinkan dari sumber tidak dikenal"** saat instal.
