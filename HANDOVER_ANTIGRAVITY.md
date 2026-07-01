# ESC Finance Apps — Dokumen Serah Terima Pengembang

> Dokumen ini ditulis untuk developer/tim baru yang akan melanjutkan pengembangan proyek ini.
> Baca seluruh dokumen sebelum menyentuh kode.

---

## 1. Gambaran Proyek

**ESC Finance Apps** adalah sistem manajemen keuangan gereja (ESC Siantan) berbasis dua platform:
- **Aplikasi Mobile (Flutter/Android)** — dipakai petugas & bendahara di lapangan saat ibadah berlangsung
- **Dashboard Web (Next.js)** — dipakai Admin, Majelis, dan Bendahara untuk monitoring, laporan, dan manajemen data

Backend sepenuhnya menggunakan **Supabase** (PostgreSQL + Auth + Storage + RLS).

**Konteks bisnis**: Proyek ini dibangun untuk dijual ke pembeli (gereja). Repo GitHub + project Supabase ikut diserahkan ke pembeli sebagai bundle. Tidak perlu memikirkan multi-tenant atau SaaS — ini adalah single-church deployment.

---

## 2. Tujuan Sistem

Menggantikan pencatatan keuangan gereja yang sebelumnya manual (kertas) dengan sistem digital yang:

1. **Merekam persembahan per kategori** — setiap jenis persembahan (Diakonia, Umum, Perpuluhan, dll.) masuk ke kas yang berbeda
2. **Rekonsiliasi kas pasca-ibadah** — penghitung & bendahara menghitung uang fisik, sistem mencocokkan dengan kategori input
3. **Multi-kas** — gereja punya 15 kas (EO Induk, PK, Anak Asuh, Pembangunan, dll.); setiap kas dikelola bendahara yang berbeda
4. **Akses berjenjang** — bendahara hanya melihat & mengelola kas yang ditugaskan padanya; Majelis/Admin melihat semua
5. **Laporan keuangan otomatis** — double-entry (jurnal umum), neraca, laporan aktivitas, arus kas; semua tergenerate otomatis dari transaksi
6. **Approval pengeluaran** — pengeluaran tunai (Kartu Biru) harus disetujui Super Admin atau yang punya hak approve
7. **Berita acara digital** — sesi ibadah dikunci dengan 4 tanda tangan digital (Penghitung 1, Penghitung 2, Bendahara, Gembala)

---

## 3. Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Database & Auth | **Supabase** (PostgreSQL 15, Auth, Storage, RLS) |
| Website | **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**, **supabase-js v2** |
| Mobile | **Flutter 3.x** (Dart), Provider pattern, **supabase_flutter** |
| Deploy Website | **Vercel** |
| Export/Import | **xlsx** (SheetJS) untuk import/export Excel |
| PDF | Chrome headless (untuk cetak laporan di website) |

**Supabase Project**: `nevczzjdvxpqiezqdhox`
- URL: `https://nevczzjdvxpqiezqdhox.supabase.co`
- Credentials ada di `website/.env.local` dan `mobile/lib/core/config.dart`

---

## 4. Struktur Direktori

```
ESC Finance Apps/
├── supabase/
│   ├── schema.sql                    ← DDL lengkap (full rebuild, JANGAN run ulang ke DB live)
│   ├── migration_kas_akses_select.sql ← Migrasi aman untuk DB live (lihat §9)
│   ├── demo_seed.sql                 ← Data demo untuk presentasi
│   └── storage_setup.sql             ← Bucket + policy untuk upload bukti nota
│
├── website/                          ← Next.js 14 App Router
│   ├── app/
│   │   ├── layout.tsx                ← Root layout + auth redirect
│   │   ├── login/                    ← Halaman login
│   │   ├── dashboard/                ← Dashboard ringkasan + stats
│   │   ├── sesi-ibadah/              ← Daftar & detail sesi ibadah
│   │   │   └── [id]/page.tsx         ← Detail sesi (pecahan + kategori + kartu biru)
│   │   ├── persembahan/              ← Tabel persembahan bulan ini
│   │   ├── pengeluaran/              ← Approval pengeluaran, tambah pengeluaran
│   │   ├── perpuluhan/               ← Checklist perpuluhan + import Excel
│   │   │   └── ImportModal.tsx       ← Modal import perpuluhan dari Excel
│   │   ├── laporan/                  ← Laporan keuangan (Aktivitas/Arus Kas/Neraca)
│   │   ├── jurnal/                   ← Jurnal umum double-entry
│   │   ├── analitik-kas/             ← Grafik saldo & pergerakan per kas
│   │   ├── akun/                     ← Manajemen kas & Chart of Accounts (COA)
│   │   ├── anggaran/                 ← Budget planning per pos
│   │   ├── kategori/                 ← Master kategori persembahan (assign ke kas)
│   │   ├── users/                    ← Manajemen user + atur akses kas
│   │   └── backup/                   ← Backup & restore data
│   │
│   ├── components/
│   │   ├── Sidebar.tsx               ← Navigasi; menu disembunyikan per role
│   │   ├── Shell.tsx                 ← Layout wrapper (sidebar + main)
│   │   ├── ScopeBanner.tsx           ← Banner info untuk bendahara (data terbatas per kas)
│   │   ├── RowAction.tsx             ← Komponen tombol aksi tabel yang konsisten
│   │   └── StatsCard.tsx             ← Kartu statistik dashboard
│   │
│   ├── lib/
│   │   ├── supabase.ts               ← Browser client + semua TypeScript types
│   │   ├── supabase-server.ts        ← Server-side client (SSR)
│   │   ├── supabase-admin.ts         ← Admin client pakai service_role key
│   │   ├── export-excel.ts           ← Helper export Excel (xlsx)
│   │   └── backup.ts                 ← Logic backup ke Supabase Storage
│   │
│   ├── middleware.ts                  ← Auth guard: redirect ke /login bila belum login
│   └── .env.local                    ← NEXT_PUBLIC_SUPABASE_URL + ANON + SERVICE_ROLE key
│
└── mobile/                           ← Flutter Android
    ├── lib/
    │   ├── main.dart                 ← Entry point
    │   ├── core/
    │   │   ├── config.dart           ← URL & anon key (diambil dari env saat build)
    │   │   ├── supabase_client.dart  ← Inisialisasi Supabase
    │   │   └── theme.dart            ← Tema warna aplikasi
    │   ├── models/models.dart        ← Semua data model (Dart)
    │   ├── data/
    │   │   ├── finance_repository.dart ← Semua query ke Supabase
    │   │   └── local_draft_store.dart  ← Draft sesi tersimpan lokal (SharedPreferences)
    │   ├── providers/
    │   │   ├── auth_provider.dart      ← State login/logout + profil user
    │   │   ├── finance_provider.dart   ← State data kas, kategori, sesi
    │   │   └── sesi_draft_provider.dart ← State form sesi aktif (kategori, denominasi, pengeluaran)
    │   └── screens/
    │       ├── auth/login_screen.dart
    │       ├── home_shell.dart         ← Bottom nav (Dashboard, Sesi, Pengeluaran, Laporan, Profil)
    │       ├── dashboard/
    │       ├── offering/
    │       │   ├── sesi_ibadah_screen.dart       ← Daftar sesi
    │       │   ├── buka_sesi_screen.dart          ← Form buka sesi baru
    │       │   ├── input_kategori_screen.dart     ← Input per kategori persembahan [LANGKAH 1]
    │       │   ├── kalkulator_denominasi_screen.dart ← Hitung uang fisik per denominasi [LANGKAH 2]
    │       │   ├── kartu_biru_screen.dart         ← Input pengeluaran tunai dalam sesi [LANGKAH 3]
    │       │   └── balancing_signature_screen.dart ← Rekonsiliasi + 4 TTD [LANGKAH 4]
    │       ├── expense/pengeluaran_screen.dart
    │       ├── budget/anggaran_screen.dart
    │       └── report/laporan_screen.dart
    │
    ├── build_apk.ps1    ← Script build APK (Windows PowerShell)
    └── run_mobile.ps1   ← Script run di device/emulator (Windows PowerShell)
```

---

## 5. Arsitektur Database (Supabase)

### Tabel Utama

```
profiles          ← user info + role (bendahara/majelis/admin/volunteer)
kas               ← 15 kas gereja, masing-masing punya saldo & akun COA
kas_akses         ← mapping user_id → kas_id (siapa boleh kelola kas apa)
akun              ← Chart of Accounts (double-entry)
kategori_persembahan ← master kategori; setiap kategori punya kas_id target
kategori_pengeluaran ← master kategori pengeluaran (Operasional, dll.)
anggota           ← daftar jemaat (untuk perpuluhan checklist)
sesi_ibadah       ← satu sesi = satu rekonsiliasi pasca-ibadah
sesi_pecahan      ← denominasi uang fisik per sesi (500, 1000, 2000, ... dst)
persembahan       ← transaksi masuk; auto-routing ke kas via kategori
pengeluaran       ← transaksi keluar; butuh approval; Kartu Biru ada sesi_id-nya
jurnal_umum       ← header jurnal double-entry
jurnal_umum_detail ← baris debit/kredit
log_backup        ← riwayat backup
```

### Alur Data Persembahan (Penting)

```
User input kategori + jumlah
        ↓
persembahan.INSERT (sesi_id, kategori_id, jumlah)
        ↓
Trigger: set_kas_persembahan()
  → baca kategori_persembahan.kas_id
  → isi persembahan.kas_id otomatis
        ↓
Trigger: posting_persembahan()
  → buat jurnal_umum + 2 baris jurnal_umum_detail
    (Debit: Kas aset, Kredit: Pendapatan kategori)
  → update kas.saldo_saat_ini += jumlah
```

### Role & Akses

| Role | Lihat | Input | Approve | Laporan Formal |
|------|-------|-------|---------|----------------|
| `bendahara` | Kas miliknya saja | Sesi & pengeluaran ke kas miliknya | Tidak | Tidak (sidebar disembunyikan) |
| `majelis` | Semua | Tidak | Tidak | Ya |
| `admin` | Semua | Semua | Ya (jika boleh_approve=true) | Ya |
| `super_admin` | Semua | Semua | Ya | Ya + manage user + manage kas |

**RLS ditegakkan di database** — bukan hanya di UI. Fungsi SECURITY DEFINER kunci:
- `lihat_kas(kas_id)` — apakah user boleh lihat kas ini
- `lihat_sesi(sesi_id)` — apakah user boleh lihat sesi ini
- `lihat_jurnal(sumber, sumber_id)` — apakah user boleh lihat entri jurnal ini
- `cek_sudah_perpuluhan(anggota_id, tahun, bulan)` — dicek lintas-kas (pengecualian sengaja)

---

## 6. Alur Kerja Mobile (Proses Ibadah)

```
Buka Sesi
  → isi Nama Sesi (custom, mis. "Pagi 29 Jun") + Jenis Ibadah + Tanggal

[LANGKAH 1] Input Kategori
  → centang kategori yang ada persembahannya
  → isi jumlah (atau nama+jumlah jika butuh_nama=true, mis. Perpuluhan)
  → "Lanjut ke Kalkulator"

[LANGKAH 2] Kalkulator Denominasi
  → hitung uang fisik lembar per lembar (500 → 100.000)
  → total fisik terlihat, dibandingkan dengan total kategori
  → "Lanjut ke Kartu Biru"

[LANGKAH 3] Kartu Biru (Pengeluaran Tunai)
  → input pengeluaran tunai yang diambil dari kantong (mis. transport penghitung)
  → otomatis dikurangi dari rekonsiliasi
  → "Lanjut ke Balancing"

[LANGKAH 4] Balancing & Tanda Tangan
  → lihat hasil: MATCH / MISMATCH
  → rumus: selisih = total_fisik - total_kategori + total_pengeluaran (MATCH jika = 0)
  → isi 4 nama + tanda tangan: Penghitung 1, Penghitung 2, Bendahara, Gembala
  → "Kunci Sesi" → status = signed_locked, tidak bisa diubah lagi
```

---

## 7. Fitur yang Sudah Selesai

### Website ✅
- [x] Login / logout (Supabase Auth)
- [x] Dashboard ringkasan (saldo, pemasukan/pengeluaran bulan ini, pending)
- [x] Sesi Ibadah — daftar, detail (pecahan + kategori + kartu biru), hapus
- [x] Persembahan — tabel per bulan, export Excel
- [x] Pengeluaran — tambah, filter status, approve/tolak, export Excel
- [x] Perpuluhan — checklist per bulan + **import dari Excel** (match nama/HP)
- [x] Laporan Keuangan — Aktivitas / Arus Kas / Neraca; filter rentang tanggal + preset (minggu ini/lalu, bulan ini/lalu, dll.)
- [x] Jurnal Umum — tampil double-entry
- [x] Analitik Kas — grafik saldo per kas
- [x] Akun & Kas — manajemen kas (tambah/ubah/nonaktifkan) + Chart of Accounts
- [x] Anggaran — budget per pos
- [x] Kategori Persembahan — master + assign kas target
- [x] Users — manajemen user + **atur akses kas** per bendahara
- [x] Backup — backup manual ke Supabase Storage
- [x] ScopeBanner — info visual untuk bendahara bahwa data terbatas per kasnya
- [x] Sidebar level akses — Laporan/Jurnal/Analitik Kas disembunyikan dari bendahara
- [x] RLS SELECT per kas — bendahara hanya bisa baca data kasnya (di kode)
- [x] Tombol aksi tabel konsisten (komponen RowAction)

### Mobile (Flutter Android) ✅
- [x] Login / logout
- [x] Dashboard ringkasan
- [x] Sesi Ibadah — daftar, buka sesi, resume draft, hapus
- [x] Alur 4 langkah: Kategori → Denominasi → Kartu Biru → Balancing + TTD
- [x] Kategori persembahan dari database (bukan hardcode); filter per kas akses
- [x] butuh_nama support (nama+jumlah per orang, mis. Perpuluhan)
- [x] Kartu Biru (pengeluaran tunai dalam sesi)
- [x] 4 tanda tangan digital
- [x] Draft sesi tersimpan lokal (bertahan jika app ditutup)
- [x] Pengeluaran (di luar sesi)
- [x] Anggaran
- [x] Laporan ringkasan

---

## 8. Yang Belum Selesai / Masih Pending

### KRITIS — Harus Dikerjakan Sebelum Serah Terima ke Pembeli

#### 8.1 Jalankan Migrasi RLS ke Database Live
File: `supabase/migration_kas_akses_select.sql`

Kode website sudah memblokir tampilan di UI (ScopeBanner, Sidebar), **tapi pembatasan di database BELUM aktif**. Tanpa migrasi ini, bendahara masih bisa melihat semua data melalui Supabase client langsung atau PostgREST.

**Cara menjalankan**:
1. Buka [Supabase SQL Editor](https://supabase.com/dashboard/project/nevczzjdvxpqiezqdhox/sql)
2. Paste seluruh isi file `supabase/migration_kas_akses_select.sql`
3. Klik Run
4. Verifikasi: login sebagai bendahara dengan 1-2 kas akses → `SELECT count(*) FROM kas` harus return < 15

#### 8.2 Deploy Website ke Vercel
Commit terakhir (`345ff45f`) **belum di-deploy**. Perlu konfirmasi dari pemilik sebelum deploy.

Perintah deploy:
```bash
vercel --prod --yes --scope melvin-s-project22
```
(Jalankan dari folder `website/`)

#### 8.3 Push ke GitHub
Branch `master` punya 5+ commit yang belum dipush karena credential mismatch (cached credential `escsiantanapps` vs repo owner `escsiantanfinance`). Developer baru harus:
```bash
git remote set-url origin https://github.com/escsiantanfinance/<nama-repo>.git
git push origin master
```

### PENTING — Sebaiknya Dikerjakan

#### 8.4 Build Release APK
APK debug tersedia di `mobile/build/` untuk testing. Release APK terblokir di mesin ini oleh Windows Smart App Control (memblokir `gen_snapshot.EXE`). Perlu build di mesin lain atau VM tanpa Smart App Control aktif.

Perintah build:
```powershell
# Di PowerShell dari folder mobile/
$env:SUPABASE_URL="https://nevczzjdvxpqiezqdhox.supabase.co"
$env:SUPABASE_ANON_KEY="<anon-key-dari-.env.local>"
C:\Users\N3N0C\flutter\bin\flutter build apk --release --dart-define=SUPABASE_URL=$env:SUPABASE_URL --dart-define=SUPABASE_ANON_KEY=$env:SUPABASE_ANON_KEY
```

#### 8.5 Fitur yang Belum Ada (Nice to Have)
- [ ] **Notifikasi push** — bendahara belum dapat notif ketika pengeluarannya disetujui/ditolak
- [ ] **Loading skeleton** — saat ini hanya teks "Memuat..." tanpa visual yang informatif
- [ ] **Toast/snackbar sukses** — setelah action berhasil (simpan, approve) tidak ada feedback visual
- [ ] **Menu Jurnal Manual** di website — bendahara bisa akses form ini; mungkin perlu disembunyikan
- [ ] **iOS support** — belum dikerjakan sama sekali; hanya Android
- [ ] **Filter per kas** di halaman Persembahan web — saat ini langsung baca dari RLS (tersembunyi otomatis untuk bendahara), tapi Admin yang mau filter per-kas tidak bisa
- [ ] **Notifikasi Kartu Biru pending** di mobile — tidak ada badge/indikator
- [ ] **Export laporan ke PDF** langsung dari aplikasi (saat ini harus print via browser)

---

## 9. Cara Setup Environment Baru

### Website (Next.js)
```bash
cd website
npm install
cp .env.local.example .env.local
# isi .env.local dengan credentials Supabase (lihat file yang sudah ada)
npm run dev        # development
npm run build      # verifikasi sebelum deploy
```

### Mobile (Flutter)
Flutter harus sudah terinstall. Di mesin pengembang lama ada di `C:\Users\N3N0C\flutter\bin`.

```bash
cd mobile
# Run di emulator / device
flutter run --dart-define=SUPABASE_URL=https://nevczzjdvxpqiezqdhox.supabase.co \
            --dart-define=SUPABASE_ANON_KEY=<anon-key>
```

Atau pakai script yang sudah ada:
```powershell
.\run_mobile.ps1        # run di device
.\build_apk.ps1         # build APK debug
```

### Database (Supabase)
- **JANGAN jalankan `schema.sql` ke database live** — file ini adalah full rebuild (DROP + CREATE) untuk setup dari nol.
- Untuk database yang sudah ada data, gunakan **file migration** di folder `supabase/migration_*.sql`.
- Data demo: `supabase/demo_seed.sql` (hapus dulu data yang ada, atau jalankan di project baru).

---

## 10. Akun Demo (untuk Presentasi)

Data demo sudah di-seed di `supabase/demo_seed.sql` dengan 3 sesi:
- **24 Mei** — sesi terkunci, selesai
- **14 Juni** — sesi terkunci dengan contoh Kartu Biru (pengeluaran 600rb)
- **21 Juni** — sesi balanced, menunggu tanda tangan

Buat akun demo langsung di Supabase Auth lalu assign role di tabel `profiles`.

---

## 11. Alur Bisnis yang Perlu Dipahami

### Mengapa kas_akses ada?
Gereja ini punya 15 kas yang dikelola bendahara berbeda. Bendahara Kas EO Induk tidak boleh melihat atau mengubah Kas Anak Asuh. `kas_akses` adalah tabel relasi yang Super Admin isi via halaman `/users → Atur Akses`.

### Mengapa ada `butuh_nama`?
Persepuluhan secara teologi harus per-orang (ada nama jemaat). Kategori lain (kolekte, persembahan Diakonia) anonim — cukup total. Flag `butuh_nama` di `kategori_persembahan` mengontrol ini.

### Mengapa selisih = fisik - kategori + pengeluaran?
Karena pengeluaran (Kartu Biru) diambil dari uang yang sudah terkumpul sebelum diitung. Jadi uang fisik yang dihitung sudah dikurangi pengeluaran. Rumus ini memastikan reconciliation tetap valid.

### Mengapa v_status_perpuluhan tidak dibatasi per kas?
Karena perpuluhan adalah kewajiban spiritual jemaat, bukan urusan kas tertentu. Majelis dan Gembala perlu melihat siapa yang belum kasih persepuluhan secara menyeluruh. Ini keputusan sengaja, bukan bug.

---

## 12. File Referensi Penting Lainnya

| File | Isi |
|------|-----|
| `PANDUAN_SISTEM.md` | Panduan lengkap untuk pengguna (Admin/Bendahara) |
| `PANDUAN_DEMO.md` | Script demo untuk presentasi ke calon pembeli |
| `SERAH_TERIMA.md` | Dokumen serah terima aset ke pembeli |
| `SETUP_GUIDE.md` | Panduan setup untuk IT gereja |
| `prd_akuntansi_gereja_v2.md` | PRD awal (sudah outdated sebagian, v3.0 lebih lengkap di sini) |
| `supabase/schema.sql` | DDL lengkap — sumber kebenaran struktur database |
| `docs/` | Screenshot UI + PDF versi panduan |

---

## 13. Riwayat Versi Singkat

| Versi | Perubahan Besar |
|-------|-----------------|
| v1.0 | Mobile dasar: sesi + denominasi + kategori hardcode (ENUM) |
| v2.0 | Web dashboard, double-entry jurnal, backup, analitik |
| v3.0 *(saat ini)* | Multi-kas per kategori, Kartu Biru dalam sesi, 4 TTD, akses berjenjang, import perpuluhan Excel, laporan per rentang tanggal, RLS SELECT per kas |

---

*Dokumen ini dibuat per 2026-07-01. Untuk pertanyaan teknis lanjutan, lihat riwayat commit git atau hubungi pengembang sebelumnya.*
