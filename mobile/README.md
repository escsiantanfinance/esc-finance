# ESC Siantan Finance — Aplikasi Mobile (Flutter)

Aplikasi Tim Finance untuk rekonsiliasi kas pasca-ibadah: buka sesi → kalkulator
denominasi → input kategori → balancing (MATCH/MISMATCH) → tanda tangan digital
Gembala & Saksi → kunci & sinkron ke Supabase.

> Folder ini berisi **kode sumber** (`lib/` + `pubspec.yaml`). Folder platform
> (`android/`, `ios/`) belum dibuat — di-generate lewat `flutter create .`
> di langkah setup. Kode ini ditulis tanpa Flutter SDK di lingkungan dev, jadi
> jalankan `flutter analyze` sekali setelah setup untuk memastikan bersih.

## Prasyarat
- Flutter SDK 3.3+ (`flutter --version`)
- Android Studio / Xcode untuk emulator/perangkat
- Project Supabase yang sudah dijalankan `supabase/schema.sql`

## Langkah setup
```bash
cd mobile

# 1) Generate folder platform (android/ios) tanpa menimpa lib/ & pubspec.yaml
flutter create .

# 2) Ambil dependency
flutter pub get

# 3) Jalankan dengan kredensial Supabase (lihat Settings → API)
flutter run \
  --dart-define=SUPABASE_URL=https://PROJECT_ID.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJhbGciOi....anon_key
```

> Alternatif: edit langsung `defaultValue` di `lib/core/config.dart` bila tidak
> mau memakai `--dart-define`.

## Supabase Storage
Buat bucket **`signatures`** dan set **Public** (agar gambar tanda tangan tampil
di Web Dashboard via URL publik). Bucket `backups` cukup di sisi web.

## Build APK untuk distribusi
```bash
flutter build apk --release \
  --dart-define=SUPABASE_URL=https://PROJECT_ID.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJ....anon_key
# Output: build/app/outputs/flutter-apk/app-release.apk
```

## Struktur kode
```
lib/
  main.dart                     # entry + MultiProvider + RootGate (login/home)
  core/                         # config, theme, supabase client
  models/models.dart            # semua model + helper (formatRupiah, denominasi)
  data/
    finance_repository.dart     # query Supabase (auth, sesi, pecahan, persembahan, dll)
    local_draft_store.dart      # sqflite — auto-save draft sesi (anti-hilang data)
  providers/                    # auth, finance, sesi_draft (state via provider)
  screens/
    auth/login_screen.dart
    home_shell.dart             # bottom nav: Beranda/Sesi/Keluar/Anggaran/Laporan
    dashboard/ expense/ budget/ report/
    offering/                   # ALUR INTI:
      sesi_ibadah_screen.dart        # daftar sesi + FAB buka sesi
      buka_sesi_screen.dart          # pilih jenis/tanggal/jam/kas → buat sesi
      kalkulator_denominasi_screen.dart
      input_kategori_screen.dart
      balancing_signature_screen.dart  # MATCH/MISMATCH + 2 tanda tangan + kunci
```

## Catatan
- State management: `provider`. Backend: `supabase_flutter`. Tanda tangan: `signature`.
- Draft sesi (denominasi + kategori) auto-tersimpan ke SQLite tiap perubahan dan
  dihapus setelah sesi terkunci & tersinkron.
- Data sesi yang sudah `signed_locked` tidak bisa diubah (ditegakkan trigger DB).
