# ESC Siantan Finance — Panduan Setup (v2.1)

Panduan ringkas. Untuk arsitektur & cara kerja lengkap lihat **`PANDUAN_SISTEM.md`**.

## Struktur Proyek
```
ESC Finance Apps/
├── supabase/
│   └── schema.sql          ← jalankan di Supabase SQL Editor
├── website/                ← Web Dashboard (Next.js) — Admin/Bendahara/Gembala
│   ├── app/  components/  lib/  middleware.ts  vercel.json
├── mobile/                 ← Aplikasi mobile (Flutter) — Tim Finance
│   ├── lib/  pubspec.yaml  README.md
├── docs/                   ← bahan presentasi (PDF & gambar UI)
├── PANDUAN_SISTEM.md       ← panduan & cara kerja lengkap
└── prd_akuntansi_gereja_v2.md
```

---

## LANGKAH 1 — Supabase
1. Buat akun & project baru di [supabase.com](https://supabase.com) (region Singapore).
2. **SQL Editor** → tempel seluruh isi `supabase/schema.sql` → **Run**.
3. **Storage** → buat bucket:
   - `signatures` → **Public** (gambar tanda tangan).
   - `backups` → **Private** (file cadangan terenkripsi).
4. Catat dari **Settings → API**: `Project URL`, `anon public`, `service_role`.

## LANGKAH 2 — User pertama (Admin)
**Authentication → Users → Add user** (isi email + password). Lalu di SQL Editor:
```sql
UPDATE profiles SET role = 'admin', is_super_admin = true WHERE id = 'USER_ID_DISINI';
```
> Catatan: pembuatan user otomatis membuat baris `profiles` (lewat trigger
> `handle_new_user`). Trigger ini memakai `SET search_path = public` — wajib ada,
> kalau tidak Supabase menolak dengan "Database error saving new user".

## LANGKAH 3 — Web Dashboard (Next.js)
```bash
cd website
npm install
cp .env.local.example .env.local
# isi: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#      SUPABASE_SERVICE_ROLE_KEY, BACKUP_ENCRYPTION_KEY, CRON_SECRET
npm run dev          # http://localhost:3000
```
`BACKUP_ENCRYPTION_KEY` & `CRON_SECRET` Anda buat sendiri (string acak):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Deploy: `vercel` → set kelima env var di Vercel. Cron backup harian sudah diatur
di `vercel.json` (02:00 WIB).

## LANGKAH 4 — Aplikasi Mobile (Flutter)
Prasyarat: Flutter SDK 3.3+. Detail lengkap di `mobile/README.md`.
```bash
cd mobile
flutter create .     # generate folder android/ios (tidak menimpa lib/)
flutter pub get
flutter run --dart-define=SUPABASE_URL=https://PROJ.supabase.co \
            --dart-define=SUPABASE_ANON_KEY=ANON_KEY
```
Build APK: `flutter build apk --release --dart-define=...` (lihat README mobile).

---

## Fitur per Platform

| Fitur | Mobile | Web Admin |
|-------|:------:|:---------:|
| Login | ✅ | ✅ |
| Dashboard & saldo | ✅ | ✅ |
| Sesi ibadah: denominasi → balancing → tanda tangan | ✅ | tinjau |
| Penyimpanan lokal (anti-hilang data) | ✅ | — |
| Ajukan pengeluaran | ✅ | ✅ |
| Setujui/tolak pengeluaran | — | ✅ |
| Bagan Akun (COA) & multi-kas (+ tambah kas) | — | ✅ |
| Jurnal umum manual | — | ✅ |
| Anggaran | lihat | ✅ |
| 3 laporan keuangan (Aktivitas/Neraca/Arus Kas) | ringkas | ✅ |
| Pelacakan perpuluhan volunteer | — | ✅ |
| Export Excel | — | ✅ |
| Backup & recovery | — | ✅ (super admin) |

## Role & Hak Akses

| Role | Hak |
|------|-----|
| `admin` (+ `is_super_admin`) | semua akses + restore data |
| `bendahara` | input & kelola transaksi, kas, jurnal, setujui pengeluaran |
| `majelis` | lihat data, ajukan pengeluaran |
| `volunteer` | checklist perpuluhan |

---

## Tips Keamanan
- Jangan pernah ekspos `SUPABASE_SERVICE_ROLE_KEY` ke client (hanya dipakai di
  `website/app/api/**`).
- **Jangan ganti `BACKUP_ENCRYPTION_KEY`** setelah ada backup — file lama jadi
  tak bisa didekripsi.
- Aktifkan email verification di Supabase Auth bila perlu.
- Backup database juga tersedia bawaan di Supabase → Settings → Database → Backups.

## Butuh Bantuan?
Lihat `PANDUAN_SISTEM.md`, atau dokumentasi [Supabase](https://supabase.com/docs),
[Next.js](https://nextjs.org/docs), dan [Flutter](https://docs.flutter.dev).
