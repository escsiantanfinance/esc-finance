# Panduan & Cara Kerja Sistem
## Sistem Akuntansi & Bendahara Gereja — ESC Siantan Finance v2.1

Dokumen ini menjelaskan arsitektur, cara kerja end-to-end, struktur akuntansi,
hak akses, cara setup, dan cara memakai modul-modul utama.

---

## 1. Arsitektur Sistem

Tiga komponen yang terhubung ke satu pusat data:

```
  ┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
  │  APLIKASI MOBILE │ ◄────► │   SUPABASE (Cloud)    │ ◄────► │  WEB DASHBOARD   │
  │   (Flutter)      │         │  PostgreSQL + Auth    │         │   (Next.js)      │
  │  Tim Finance     │         │  + Storage + RLS      │         │  Admin & Gembala │
  └─────────────────┘         └──────────────────────┘         └─────────────────┘
   input cepat di lapangan      satu sumber kebenaran            otorisasi, akuntansi,
   denominasi, e-signature      (akun + jurnal_umum)             laporan, backup
```

- **Mobile (Flutter)** — `mobile/`. Dipakai Tim Finance untuk menghitung dan
  merekonsiliasi kas pasca-ibadah. Menyimpan draft lokal (SQLite) agar tidak hilang.
- **Web (Next.js)** — `website/`. Dipakai Bendahara/Admin/Gembala untuk akuntansi,
  persetujuan, laporan, dan backup.
- **Supabase** — `supabase/schema.sql`. Database relasional + Auth + Storage,
  dengan Row Level Security (RLS) berbasis peran.

---

## 2. Cara Kerja End-to-End (Rekonsiliasi Kas Pasca-Ibadah)

Lima langkah baku, dijalankan di **aplikasi mobile**:

1. **Buka sesi** — pilih jenis ibadah, tanggal, jam, kas tujuan → sistem membuat
   record `sesi_ibadah` berstatus `draft`.
2. **Kalkulator denominasi** — masukkan jumlah lembar tiap pecahan
   (100rb…1rb). Sistem menghitung **total fisik** otomatis (`sesi_pecahan`,
   `total_fisik` dihitung trigger).
3. **Input kategori** — masukkan nominal per kategori (Perpuluhan, Persembahan
   Umum, Janji Iman, dst). Tersimpan sebagai baris `persembahan` tertaut sesi
   → `total_kategori` dihitung trigger.
4. **Balancing** — sistem membandingkan total fisik vs total kategori:
   - **MATCH** (selisih = 0) → tombol tanda tangan aktif.
   - **MISMATCH** → harus diperbaiki dulu.
5. **Tanda tangan & kunci** — Gembala dan Saksi menandatangani di layar
   (gambar diunggah ke Storage). Sesi menjadi `signed_locked`:
   **tidak bisa diubah lagi** (ditegakkan trigger DB), dan saldo kas otomatis
   ter-update lewat posting jurnal.

Sepanjang langkah 2–3, setiap ketikan **auto-save ke SQLite** lokal — bila aplikasi
tertutup/baterai habis, draft dipulihkan. Draft dihapus setelah sesi terkunci.

---

## 3. Struktur Akuntansi (COA & Jurnal)

Sistem memakai **double-entry sederhana** sebagai satu sumber kebenaran:

- **`akun`** — Bagan Akun (Chart of Accounts): Aset, Kewajiban, Ekuitas/Dana,
  Pendapatan, Beban. Tiap akun punya kode (mis. `1-1001 Kas Gereja`,
  `4-1001 Perpuluhan`, `5-1001 Beban Operasional`).
- **`jurnal_umum` + `jurnal_umum_detail`** — buku besar universal (baris debit/kredit).

**Posting otomatis (lewat trigger):**
| Transaksi | Debit | Kredit |
|-----------|-------|--------|
| Persembahan masuk | Kas/Bank (Aset) | Pendapatan (sesuai jenis) |
| Pengeluaran disetujui | Beban (sesuai kategori) | Kas/Bank (Aset) |
| Jurnal manual | (diisi sendiri, harus debit = kredit) | |

Karena semua bersumber dari `jurnal_umum_detail`, **tiga laporan keuangan selalu
konsisten**:
- **Laporan Aktivitas** (`v_laporan_aktivitas`) — pendapatan − beban = surplus/defisit.
- **Neraca** (`v_neraca`) — saldo aset, kewajiban, ekuitas.
- **Arus Kas** (`v_arus_kas`) — mutasi masuk/keluar tiap pos kas.

Saldo kas (`kas.saldo_saat_ini`) dihitung ulang otomatis (anti-drift) tiap ada
persembahan/pengeluaran.

---

## 4. Role & Hak Akses

| Peran | Deskripsi | Hak utama |
|-------|-----------|-----------|
| **Super Admin** | Gembala Senior | Semua akses **+ pemulihan data (restore)** |
| **admin** | Administrator | Kelola akun/COA, kategori, semua data |
| **bendahara** | Bendahara | Input & kelola transaksi, kas, jurnal, setujui pengeluaran |
| **majelis** | Pengurus | Lihat data, ajukan pengeluaran |
| **volunteer** | Relawan pelayanan | Checklist perpuluhan |

Ditegakkan lewat **RLS** di database + gating menu di web. `is_super_admin`
adalah flag terpisah (mis. seorang admin sekaligus super admin).

Menjadikan user pertama admin + super admin:
```sql
UPDATE profiles SET role='admin', is_super_admin=true WHERE id='<USER_ID>';
```

---

## 5. Cara Setup

### 5.1 Supabase (database)
1. Buat project di [supabase.com](https://supabase.com).
2. **SQL Editor** → tempel seluruh `supabase/schema.sql` → **Run**.
3. **Storage** → buat 2 bucket:
   - `signatures` → **Public** (gambar tanda tangan tampil di web).
   - `backups` → **Private** (file cadangan terenkripsi).
4. **Authentication → Users** → buat user pertama, lalu jadikan admin (SQL di §4).
5. Catat dari **Settings → API**: Project URL, `anon` key, `service_role` key.

### 5.2 Web Dashboard (`website/`)
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

### 5.3 Mobile (`mobile/`)
Lihat `mobile/README.md`. Ringkas:
```bash
cd mobile
flutter create .          # generate folder android/ios (tidak menimpa lib/)
flutter pub get
flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
```

---

## 6. Modul Multi-Kas & Analitik Kas (Admin)

- **Tambah jenis kas baru**: menu **Akun & Kas → + Tambah Kas** (nama, tipe
  tunai/bank/digital, saldo awal, akun COA terkait). Langsung tersedia di semua modul.
- **Bagan Akun (COA)** tampil di halaman yang sama.
- **Analitik kas**: tren & mutasi per pos kas tersedia dari view `v_analitik_kas`
  (mutasi masuk/keluar per bulan per kas).

---

## 7. Modul Pelacakan Perpuluhan Volunteer

Menu **Perpuluhan** (web):
1. Tambah **anggota/volunteer** (nama, kontak, divisi, wajib perpuluhan).
2. Pilih periode (bulan/tahun) → lihat **checklist**: siapa **Sudah** / **Belum**
   mengembalikan perpuluhan, plus persentase ketaatan.
3. **Penandaan otomatis**: begitu persembahan berkategori *Perpuluhan* yang
   ditautkan ke anggota dicatat pada periode itu, status anggota otomatis
   menjadi **Sudah** (view `v_status_perpuluhan`) — tanpa input ganda.
4. Filter daftar **Belum** untuk follow-up; data bisa di-export Excel.

---

## 8. Modul Backup & Recovery (Super Admin)

Menu **Backup** (hanya tampil untuk Super Admin):
- **Picu pencadangan** → server membuat `.xlsx + .json`, dikompres ZIP,
  **dienkripsi AES-256**, diunggah ke Storage `backups`, dan dicatat di log.
- **Pencadangan otomatis** harian 02:00 WIB (Vercel Cron → `/api/backup/scheduled`),
  dengan retensi 30 harian + 12 bulanan.
- **Pulihkan dari Excel**: unggah file `.xlsx` → sistem tampilkan **pratinjau
  jumlah baris** → konfirmasi → upsert. Jurnal & saldo dibangun ulang otomatis
  oleh trigger. Hanya Super Admin.

---

## 9. Ekspor Excel

Tombol **⬇ Export Excel** tersedia di halaman Persembahan, Pengeluaran, Anggaran,
Perpuluhan, dan Laporan (browser-side via SheetJS). Ini jalur berbeda dari Backup:
export per-halaman untuk dibuka/analisis di Excel, sedangkan Backup untuk
pemulihan bencana (server, terenkripsi).

---

## 10. Ringkasan Fitur per Platform

| Fitur | Mobile | Web Admin |
|-------|:------:|:---------:|
| Login & keamanan | ✅ | ✅ |
| Dashboard & saldo | ✅ | ✅ |
| Sesi ibadah (buat & rekonsiliasi) | ✅ | tinjau |
| Kalkulator denominasi | ✅ | — |
| MATCH/MISMATCH + tanda tangan | ✅ | tinjau |
| Penyimpanan lokal (anti-hilang) | ✅ | — |
| Ajukan pengeluaran | ✅ | ✅ |
| Setujui/tolak pengeluaran | — | ✅ |
| Bagan Akun (COA) & multi-kas | — | ✅ |
| Jurnal umum manual | — | ✅ |
| Anggaran | lihat | ✅ |
| 3 laporan keuangan | ringkas | ✅ |
| Pelacakan perpuluhan | — | ✅ |
| Export Excel | — | ✅ |
| Backup & recovery | — | ✅ (super admin) |

---

*Dokumen ini melengkapi `SETUP_GUIDE.md` (panduan setup ringkas) dan
`prd_akuntansi_gereja_v2.md` (spesifikasi produk).*
