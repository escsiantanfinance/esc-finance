# ESC Siantan Finance

**Sistem Akuntansi & Bendahara Gereja Terintegrasi** — web (admin/bendahara) + mobile (lapangan) + database akuntansi double‑entry.

🌐 **Demo live:** https://project-escfinance.vercel.app

---

## Apa ini?

Aplikasi pengelolaan keuangan gereja yang menggabungkan:
- **Rekonsiliasi kas pasca‑ibadah** — hitung pecahan uang, cocokkan dengan kategori persembahan, tanda tangan Gembala & Saksi, lalu kunci data.
- **Akuntansi otomatis** — setiap transaksi terposting double‑entry ke jurnal; Laporan Aktivitas, Neraca, dan Arus Kas muncul otomatis.
- **Multi‑kas** — kelola banyak dompet/rekening dengan saldo real‑time.
- **Pelacakan perpuluhan** — daftar centang otomatis siapa sudah/belum mengembalikan.
- **Anggaran vs realisasi**, **manajemen pengeluaran berjenjang**, dan **backup terenkripsi otomatis**.

---

## Struktur proyek

```
.
├── website/            # Aplikasi web — Next.js 14 + Supabase (App Router)
├── mobile/             # Aplikasi mobile — Flutter
├── supabase/
│   ├── schema.sql      # Skema database lengkap (jalankan di Supabase SQL Editor)
│   └── demo_seed.sql   # Data contoh untuk demo (opsional)
├── docs/               # PDF fitur + tangkapan layar UI (web & mobile)
├── PANDUAN_SISTEM.md   # Cara kerja sistem end‑to‑end
├── SETUP_GUIDE.md      # Panduan setup detail
├── PANDUAN_DEMO.md     # Skrip presentasi ke pembeli
├── SERAH_TERIMA.md     # Dokumen serah‑terima & ambil‑alih
└── prd_akuntansi_gereja_v2.md   # Spesifikasi produk (PRD)
```

---

## Mulai cepat (web)

```bash
cd website
npm install
cp .env.local.example .env.local     # isi kredensial Supabase
npm run dev                           # http://localhost:3000
```

**Database:** buka Supabase SQL Editor → jalankan `supabase/schema.sql` → (opsional) `supabase/demo_seed.sql`.

**Mobile:** lihat [`mobile/README.md`](mobile/README.md) (butuh Flutter SDK).

Panduan lengkap ada di **[SETUP_GUIDE.md](SETUP_GUIDE.md)**.

---

## Teknologi

| Lapisan | Stack |
|---|---|
| Web | Next.js 14, React 18, Tailwind CSS, `@supabase/ssr` |
| Mobile | Flutter, `provider`, `supabase_flutter`, `sqflite`, `signature` |
| Backend | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Akuntansi | Double‑entry ledger via trigger Postgres (auto‑posting) |
| Ekspor & Backup | SheetJS (`xlsx`), `jszip`, AES‑256‑GCM |

---

## Peran pengguna

- **Bendahara** — input & kelola transaksi, laporan.
- **Majelis** — lihat laporan & data.
- **Admin** — kelola COA, kas, kategori, pengguna.
- **Super Admin** — akses Backup & Restore.
- **Volunteer** — pelacakan perpuluhan.

Lihat **[SERAH_TERIMA.md](SERAH_TERIMA.md)** untuk informasi kepemilikan & serah‑terima.
