# Dokumen Serah‑Terima — ESC Siantan Finance
**Sistem Akuntansi & Bendahara Gereja Terintegrasi**

Dokumen ini merangkum **apa yang diterima pembeli** dan **cara mengambil alih kepemilikan**.

---

## 1. Isi paket

| Komponen | Lokasi | Keterangan |
|---|---|---|
| **Aplikasi Web** | `website/` | Next.js 14 — panel admin/bendahara (sudah live di Vercel) |
| **Aplikasi Mobile** | `mobile/` | Flutter — penghitungan kas & tanda tangan di lapangan |
| **Database** | `supabase/schema.sql` | Skema lengkap + seed COA/kas/kategori |
| **Data contoh** | `supabase/demo_seed.sql` | Untuk demo/percobaan (opsional) |
| **Dokumentasi** | `PANDUAN_SISTEM.md`, `SETUP_GUIDE.md`, `prd_akuntansi_gereja_v2.md` | Cara kerja, setup, & spesifikasi produk |
| **Panduan demo** | `PANDUAN_DEMO.md` | Skrip presentasi |
| **Materi visual** | `docs/` | PDF fitur, tangkapan layar UI web & mobile (PNG) |

---

## 2. Akses live saat ini

- **Website:** https://project-escfinance.vercel.app
- **Akun admin:** escsiantanfinance@gmail.com
- **Hosting web:** Vercel (project `esc-finance`)
- **Database & Auth:** Supabase (project `nevczzjdvxpqiezqdhox`)
- **Kode sumber:** GitHub `escsiantanfinance/esc-finance`

---

## 3. Yang diserahkan ke pembeli

Karena dijual sebagai **paket utuh**, pembeli menerima akses ke 3 layanan berikut. Pilih salah satu cara transfer untuk masing‑masing:

### a) GitHub (kode sumber)
- **Opsi 1 — transfer repo:** GitHub → repo → Settings → _Transfer ownership_ ke akun pembeli.
- **Opsi 2 — serahkan akun:** berikan kredensial akun `escsiantanfinance` ke pembeli.

### b) Supabase (database + auth)
- **Opsi 1 — transfer:** Supabase → Project Settings → _Transfer project_ ke organisasi pembeli.
- **Opsi 2 — serahkan akun:** berikan login akun Supabase.
- Pembeli sebaiknya **mengganti kata sandi** akun setelah menerima.

### c) Vercel (hosting web)
- **Opsi 1 — transfer:** Vercel → Project → Settings → _Transfer_ ke akun pembeli.
- **Opsi 2 — deploy ulang:** pembeli buat project Vercel sendiri dari repo, lalu isi Environment Variables (lihat §4).

---

## 4. Environment Variables (wajib diisi di hosting)

Daftar variabel ada di `website/.env.local.example`. Nilai asli **tidak disimpan di kode** (demi keamanan) — diserahkan terpisah. Yang perlu diisi:

| Variabel | Dari mana |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (anon/public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (service_role) — **rahasia** |
| `BACKUP_ENCRYPTION_KEY` | string acak panjang (jangan diubah bila sudah ada backup) |
| `CRON_SECRET` | string acak untuk melindungi endpoint cron |

> Di Vercel: Project → Settings → Environment Variables. Saat ini variabel sudah terisi untuk environment **Production**.

---

## 5. Catatan keamanan untuk pembeli (disarankan setelah serah‑terima)

1. **Ganti kata sandi** akun GitHub, Supabase, dan Vercel.
2. **Rotasi kunci Supabase** bila ingin memutus akses lama: Supabase → Settings → API → _Reset_ (akan menghasilkan anon & service_role baru; perbarui di env Vercel).
3. **Buat akun admin sendiri** (Authentication → Users) lalu jadikan admin:
   ```sql
   update public.profiles set role='admin', is_super_admin=true where id='<USER_ID>';
   ```
4. Pastikan `BACKUP_ENCRYPTION_KEY` **tidak pernah diganti** setelah ada file backup (kalau diganti, backup lama tidak bisa dibuka).

---

## 6. Cara menjalankan dari nol (ringkas)

**Web (lokal):**
```bash
cd website
npm install
cp .env.local.example .env.local   # lalu isi nilainya
npm run dev                          # http://localhost:3000
```

**Database:** jalankan `supabase/schema.sql` di Supabase SQL Editor → (opsional) `supabase/demo_seed.sql`.

**Mobile:** lihat `mobile/README.md` — butuh Flutter SDK (`flutter pub get` lalu `flutter run`).

Detail lengkap: **`SETUP_GUIDE.md`**.

---

*Disusun untuk serah‑terima ESC Siantan Finance. Untuk pertanyaan teknis, rujuk `PANDUAN_SISTEM.md`.*
