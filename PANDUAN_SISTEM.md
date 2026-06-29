# Panduan & Cara Kerja Sistem
## Sistem Akuntansi & Bendahara Gereja — ESC Siantan Finance v3.0

Dokumen ini menjelaskan arsitektur, cara kerja end-to-end, struktur akuntansi,
hak akses, cara setup, dan cara memakai modul-modul utama.

---

## 1. Arsitektur Sistem

Tiga komponen yang terhubung ke satu pusat data:

```
  ┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
  │  APLIKASI MOBILE │ ◄────► │   SUPABASE (Cloud)    │ ◄────► │  WEB DASHBOARD   │
  │   (Flutter)      │         │  PostgreSQL + Auth    │         │   (Next.js)      │
  │  Bendahara       │         │  + Storage + RLS      │         │  Super Admin     │
  └─────────────────┘         └──────────────────────┘         └─────────────────┘
   input cepat di lapangan      satu sumber kebenaran            atur kas/kategori/akses,
   denominasi, e-signature      (akun + jurnal_umum)             akuntansi, approval, laporan
```

- **Mobile (Flutter)** — `mobile/`. Dipakai Bendahara untuk menghitung dan
  merekonsiliasi kas pasca-ibadah, **hanya untuk kas yang ditugaskan padanya**.
  Menyimpan draft lokal (SQLite) agar tidak hilang.
- **Web (Next.js)** — `website/`. Dipakai Super Admin/Admin/Majelis untuk
  mengatur kas & kategori, persetujuan pengeluaran, akuntansi, laporan, dan backup.
- **Supabase** — `supabase/schema.sql`. Database relasional + Auth + Storage,
  dengan Row Level Security (RLS) berbasis peran **dan akses kas per pengguna**.

---

## 2. Konsep Inti v3.0: Multi-Kas per Kategori

Perubahan terbesar dari versi sebelumnya: **setiap kategori persembahan menuju
satu kas tujuan sendiri**, bukan satu kas per sesi. Artinya satu kali hitung
uang (satu sesi) bisa otomatis terbagi ke beberapa kas sekaligus — sama seperti
form kertas yang dipakai gereja: "Persembahan Pagi" bisa berisi Ibadah Raya,
Persepuluhan, Pembangunan Gedung, dan Anak Asuh sekaligus, masing-masing masuk
ke dompet/kas yang berbeda.

```
            ┌──────────────┐
            │  Kas: PK     │ ◄── Persepuluhan
            ├──────────────┤
  Sesi      │  Kas: EO     │ ◄── Ibadah Raya, Kolekte, Ucapan Syukur
  hitung  ─►│  Induk       │
  uang      ├──────────────┤
            │  Kas:        │ ◄── Pembangunan Gedung, Janji Iman
            │  Pembangunan │
            └──────────────┘
```

**Kategori persembahan** (mis. "Persepuluhan", "Ibadah Raya", "Pembangunan
Gedung") dibuat & dikelola **Super Admin** di menu **Kategori** (web). Tiap
kategori punya:
- **Kas tujuan** — ke mana uangnya masuk.
- **Akun pendapatan (COA)** — untuk posting jurnal otomatis.
- **Butuh nama?** — kalau diaktifkan, input kategori ini mengumpulkan daftar
  nama pemberi + nominal (cocok untuk Persepuluhan, Pembangunan, dst). Kalau
  tidak, cukup satu nominal total (cocok untuk Ibadah Raya, Kolekte).

**Akses kas** diatur Super Admin di menu **Pengguna**: tiap bendahara hanya
bisa membuka/mengisi kas yang ditugaskan padanya (tabel `kas_akses`). Admin &
Super Admin otomatis punya akses ke semua kas.

---

## 3. Cara Kerja End-to-End (Rekonsiliasi Kas Pasca-Ibadah)

Enam langkah baku, dijalankan di **aplikasi mobile** — urutannya mengikuti
cara kerja form kertas: **kategorikan uang dulu, baru hitung fisiknya untuk
verifikasi** (bukan sebaliknya):

1. **Buka sesi** — beri **nama sesi bebas** (mis. "Persembahan Pagi"), pilih
   jenis ibadah, tanggal, jam → sistem membuat record `sesi_ibadah` berstatus
   `draft`.
2. **Pilih & isi kategori** — bendahara mencentang kategori mana yang
   dihitung pada sesi ini (**hanya kategori yang kasnya ia punya akses** —
   bendahara lain dengan kas berbeda akan melihat daftar kategori yang
   berbeda pula), lalu isi nominal. Untuk kategori "butuh nama" (Persepuluhan,
   Pembangunan, dst), tambahkan baris nama + nominal satu per satu. Tersimpan
   sebagai baris `persembahan`, **kas tujuan terisi otomatis** dari kategori
   → `total_kategori` dihitung trigger.
3. **Kalkulator denominasi** — masukkan jumlah lembar tiap pecahan
   (100rb…1rb) dari uang fisik yang terkumpul. Sistem menghitung **total fisik**
   otomatis (`sesi_pecahan`, `total_fisik` dihitung trigger) — layar ini
   menampilkan total kategori dari langkah 2 sebagai pembanding langsung
   selagi menghitung.
4. **Kartu Biru (opsional)** — kalau ada pengeluaran tunai langsung dari uang
   yang baru dihitung (mis. beli ATK, ongkos kebersihan), catat di sini.
   Tersimpan sebagai `pengeluaran` status **pending**, tertaut ke sesi —
   ikut diperhitungkan dalam rekonsiliasi, tapi baru masuk jurnal/mengurangi
   saldo kas resmi setelah **disetujui** (lihat §5).
5. **Balancing** — sistem membandingkan:
   **total fisik = total kategori − total kartu biru**
   - **MATCH** (selisih = 0) → tombol tanda tangan aktif.
   - **MISMATCH** → harus diperbaiki dulu (kembali ke langkah 2–4).
6. **Tanda tangan & kunci** — **4 pihak** menandatangani di layar (gambar
   diunggah ke Storage): **Penghitung 1, Penghitung 2, Bendahara, Gembala**.
   Sesi menjadi `signed_locked`: **tidak bisa diubah lagi** (ditegakkan trigger
   DB), dan saldo kas otomatis ter-update lewat posting jurnal.

Sepanjang langkah 2–4, setiap ketikan **auto-save ke SQLite** lokal — bila
aplikasi tertutup/baterai habis, draft dipulihkan saat dibuka kembali (termasuk
kategori yang sudah dipilih & kartu biru yang sudah diketik). Draft dihapus
setelah sesi terkunci.

> Sesi yang masih `draft`/`balanced` (belum terkunci) bisa **dilanjutkan**
> kapan saja dari daftar Sesi Ibadah, atau **dihapus** kalau salah hitung —
> keduanya otomatis memulihkan saldo & jurnal lewat trigger.

---

## 4. Alur Persetujuan Pengeluaran

Semua pengeluaran (Kartu Biru maupun pengajuan biasa dari menu Pengeluaran)
melalui status: `pending` → `disetujui` / `ditolak`.

- **Mengajukan**: bendahara (mobile/web), untuk kas yang ia punya akses.
- **Menyetujui/menolak**: **Super Admin** selalu bisa; pengguna lain (mis.
  Majelis tertentu) bisa diberi izin lewat flag `boleh_approve_pengeluaran`
  di menu **Pengguna** (Super Admin yang mengatur).
- Saat **disetujui** → baru saat itu jurnal terposting & saldo kas terpotong.
  Status `pending`/`ditolak` tidak memengaruhi saldo resmi (tapi `pending`
  tetap ikut rekonsiliasi sesi, karena uang fisiknya sudah keluar di lapangan).

---

## 5. Struktur Akuntansi (COA & Jurnal)

Sistem memakai **double-entry sederhana** sebagai satu sumber kebenaran:

- **`akun`** — Bagan Akun (Chart of Accounts): Aset, Kewajiban, Ekuitas/Dana,
  Pendapatan, Beban. Tiap **kas** punya sub-akun Aset sendiri (mis.
  `1-1101 Kas PK`, `1-1107 Kas EO - Induk`); tiap **kategori persembahan**
  tertaut satu akun Pendapatan; tiap **kategori pengeluaran** tertaut satu
  akun Beban.
- **`jurnal_umum` + `jurnal_umum_detail`** — buku besar universal (baris debit/kredit).

**Posting otomatis (lewat trigger):**
| Transaksi | Debit | Kredit |
|-----------|-------|--------|
| Persembahan masuk | Kas (sesuai `kategori.kas_id`) | Pendapatan (sesuai kategori) |
| Pengeluaran disetujui | Beban (sesuai kategori) | Kas (Aset) |
| Jurnal manual | (diisi sendiri, harus debit = kredit) | |

Karena semua bersumber dari `jurnal_umum_detail`, **tiga laporan keuangan selalu
konsisten**:
- **Laporan Aktivitas** (`v_laporan_aktivitas`) — pendapatan − beban = surplus/defisit.
- **Neraca** (`v_neraca`) — saldo aset, kewajiban, ekuitas.
- **Arus Kas** (`v_arus_kas`) — mutasi masuk/keluar tiap pos kas.
- **Rekap Saldo Kas** (`v_rekap_saldo_kas`) — saldo seluruh kas berjalan dalam satu tabel.

Saldo kas (`kas.saldo_saat_ini`) dihitung ulang otomatis (anti-drift) tiap ada
persembahan/pengeluaran.

---

## 6. Role & Hak Akses

| Peran | Deskripsi | Hak utama |
|-------|-----------|-----------|
| **Super Admin** | Pemilik/Gembala Senior | Semua akses tanpa batas: kelola kas, kategori, pengguna, akses kas per bendahara, izin approve, **+ pemulihan data (restore)** |
| **admin** | Administrator | Kelola COA, kategori pengeluaran, semua data — akses ke semua kas |
| **bendahara** | Bendahara | Input & kelola transaksi **hanya untuk kas yang ditugaskan** (`kas_akses`) |
| **majelis** | Pengurus | Lihat data, ajukan pengeluaran; bisa diberi izin **menyetujui pengeluaran** bila `boleh_approve_pengeluaran = true` |
| **volunteer** | Relawan pelayanan | Checklist perpuluhan |

Ditegakkan lewat **RLS** di database + gating menu di web. `is_super_admin`
dan `boleh_approve_pengeluaran` adalah flag terpisah dari `role` (mis. seorang
majelis bisa diberi izin approve tanpa naik jadi admin).

Menjadikan user pertama Super Admin:
```sql
UPDATE profiles SET role='admin', is_super_admin=true WHERE id='<USER_ID>';
```
Memberi izin approve pengeluaran ke seorang majelis:
```sql
UPDATE profiles SET boleh_approve_pengeluaran=true WHERE id='<USER_ID>';
```
Memberi bendahara akses ke sebuah kas:
```sql
INSERT INTO kas_akses (kas_id, user_id) VALUES ('<KAS_ID>', '<USER_ID>');
```
(Ketiganya juga bisa diatur lewat menu **Pengguna** di web — Super Admin saja yang melihat menu ini.)

---

## 7. Cara Setup

### 7.1 Supabase (database)
1. Buat project di [supabase.com](https://supabase.com).
2. **SQL Editor** → tempel seluruh `supabase/schema.sql` → **Run**. (Otomatis
   menyeed 15 kas + 11 kategori persembahan + kategori pengeluaran + COA.)
3. **SQL Editor** → tempel `supabase/storage_setup.sql` → **Run**. Membuat 3
   bucket (`signatures`, `bukti`, `backups`) + RLS policy upload-nya — **wajib**,
   tanpa ini tanda tangan & nota gagal terunggah (403).
4. (Opsional, demo/percobaan) **SQL Editor** → `supabase/demo_seed.sql` → **Run**.
5. **Authentication → Users** → buat user pertama, lalu jadikan Super Admin (SQL di §6).
6. Catat dari **Settings → API**: Project URL, `anon` key, `service_role` key.

### 7.2 Web Dashboard (`website/`)
```bash
cd website
npm install
cp .env.local.example .env.local   # isi nilainya (lihat di bawah)
npm run dev                          # http://localhost:3000
```
Isi `.env.local`:
| Variabel | Sumber |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings → API (rahasia) |
| `BACKUP_ENCRYPTION_KEY` | **buat sendiri** — string acak panjang |
| `CRON_SECRET` | **buat sendiri** — string acak |

Bangkitkan dua rahasia terakhir: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Deploy ke Vercel: set kelima variabel di **Settings → Environment Variables**.
`vercel.json` sudah menjadwalkan backup harian (02:00 WIB) via cron.

### 7.3 Mobile (`mobile/`)
Lihat `mobile/README.md`. Ringkas:
```bash
cd mobile
flutter create .          # generate folder android/ios (tidak menimpa lib/)
flutter pub get
flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
```
Setelah login pertama kali, **Super Admin harus memberi akses kas** ke akun
bendahara tersebut (menu Pengguna di web) — tanpa ini, daftar kategori di
mobile akan tampil kosong.

---

## 8. Modul Kategori Persembahan (Super Admin)

Menu **Kategori** (web, khusus Super Admin):
- **Tambah/edit kategori**: nama, kas tujuan, akun pendapatan COA, flag
  "butuh nama pemberi", flag "ini perpuluhan" (untuk pelacakan otomatis §10), urutan tampil.
- **Nonaktifkan** kategori yang tidak dipakai lagi (data lama tetap aman, hanya
  disembunyikan dari pilihan baru).

## 9. Modul Multi-Kas & Akses (Super Admin)

- **Tambah/kurangi kas**: menu **Akun & Kas → + Tambah Kas** (nama, tipe
  tunai/bank/digital, penanggung jawab, saldo awal, akun COA terkait).
  Hanya Super Admin yang bisa menambah/menghapus kas.
- **Atur akses bendahara**: menu **Pengguna → (kelola akses kas)** — pilih kas
  mana yang boleh diakses bendahara tertentu.
- **Analitik kas**: tren & mutasi per pos kas tersedia dari view `v_analitik_kas`.

## 10. Modul Pelacakan Perpuluhan Volunteer

Menu **Perpuluhan** (web):
1. Tambah **anggota/volunteer** (nama, kontak, divisi, wajib perpuluhan).
2. Pilih periode (bulan/tahun) → lihat **checklist**: siapa **Sudah** / **Belum**
   mengembalikan perpuluhan, plus persentase ketaatan.
3. **Penandaan otomatis**: begitu persembahan dari kategori yang ditandai
   "ini perpuluhan" dan ditautkan ke anggota dicatat pada periode itu, status
   anggota otomatis menjadi **Sudah** (view `v_status_perpuluhan`).
4. Filter daftar **Belum** untuk follow-up; data bisa di-export Excel.

## 11. Modul Backup & Recovery (Super Admin)

Menu **Backup** (hanya tampil untuk Super Admin):
- **Picu pencadangan** → server membuat `.xlsx + .json` (termasuk tabel
  `kategori_persembahan` & `kas_akses`), dikompres ZIP, **dienkripsi AES-256**,
  diunggah ke Storage `backups`, dan dicatat di log.
- **Pencadangan otomatis** harian 02:00 WIB (Vercel Cron → `/api/backup/scheduled`),
  dengan retensi 30 harian + 12 bulanan.
- **Pulihkan dari Excel**: unggah file `.xlsx` → sistem tampilkan **pratinjau
  jumlah baris** → konfirmasi → upsert. Jurnal & saldo dibangun ulang otomatis
  oleh trigger. Hanya Super Admin.

## 12. Ekspor Excel

Tombol **⬇ Export Excel** tersedia di halaman Persembahan, Pengeluaran, Anggaran,
Perpuluhan, dan Laporan (browser-side via SheetJS). Ini jalur berbeda dari Backup:
export per-halaman untuk dibuka/analisis di Excel, sedangkan Backup untuk
pemulihan bencana (server, terenkripsi).

---

## 13. Ringkasan Fitur per Platform

| Fitur | Mobile | Web Admin |
|-------|:------:|:---------:|
| Login & keamanan | ✅ | ✅ |
| Dashboard & saldo | ✅ | ✅ |
| Sesi ibadah: nama custom, kategori manual, kartu biru | ✅ | tinjau |
| Kalkulator denominasi | ✅ | — |
| MATCH/MISMATCH + 4 tanda tangan | ✅ | tinjau |
| Penyimpanan lokal (anti-hilang) | ✅ | — |
| Ajukan pengeluaran | ✅ | ✅ |
| Setujui/tolak pengeluaran (Super Admin / izin khusus) | — | ✅ |
| Kategori persembahan custom (per kas) | lihat | ✅ (Super Admin) |
| Akses kas per bendahara | terbatas | ✅ (Super Admin) |
| Bagan Akun (COA) & multi-kas | — | ✅ |
| Jurnal umum manual | — | ✅ |
| Anggaran | lihat | ✅ |
| 3 laporan keuangan + rekap saldo kas | ringkas | ✅ |
| Pelacakan perpuluhan | — | ✅ |
| Export Excel | — | ✅ |
| Backup & recovery | — | ✅ (Super Admin) |

---

*Dokumen ini melengkapi `SETUP_GUIDE.md` (panduan setup ringkas) dan
`prd_akuntansi_gereja_v2.md` (spesifikasi produk awal — beberapa bagian sudah
dilampaui oleh redesign v3.0 di dokumen ini).*
