# ESC Siantan Finance — Aplikasi Mobile (Flutter)

Aplikasi Tim Finance untuk rekonsiliasi kas pasca-ibadah: buka sesi → kalkulator
denominasi → input kategori → balancing (MATCH/MISMATCH) → tanda tangan digital
Gembala & Saksi → kunci & sinkron ke Supabase.

> Folder ini berisi **kode sumber** (`lib/` + `pubspec.yaml`). Folder platform
> (`android/`, `ios/`) belum dibuat — di-generate lewat `flutter create .`
> di langkah setup. Kode ini ditulis tanpa Flutter SDK di lingkungan dev, jadi
> jalankan `flutter analyze` sekali setelah setup untuk memastikan bersih.

## Prasyarat (sekali pasang di komputer Windows)
1. **Flutter SDK 3.3+** — unduh & ikuti: https://docs.flutter.dev/get-started/install/windows
   Pastikan `flutter --version` jalan di PowerShell.
2. **Android Studio** — untuk Android SDK + emulator. Setelah instal, buka sekali,
   lalu jalankan `flutter doctor --android-licenses` dan terima semua lisensi.
3. **Perangkat**: HP Android (aktifkan *Developer options* → *USB debugging*, sambungkan via USB)
   **atau** emulator dari Android Studio.
4. **Supabase** sudah dijalankan `supabase/schema.sql` (lihat `../SETUP_GUIDE.md`).

> Cek kesiapan dengan: `flutter doctor` — semua harus centang hijau (kecuali iOS bila di Windows).

## Langkah setup — cara mudah (skrip otomatis)
Dari folder `mobile`, di PowerShell:
```powershell
# 1) Setup sekali: buat folder Android + dependency + cek kode
powershell -ExecutionPolicy Bypass -File .\setup_windows.ps1

# 2) Jalankan ke HP/emulator (kredensial Supabase sudah terisi)
powershell -ExecutionPolicy Bypass -File .\run_mobile.ps1
```

## Langkah setup — cara manual
```bash
cd mobile
flutter create --org com.escsiantan --project-name esc_siantan_finance --platforms=android .
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://nevczzjdvxpqiezqdhox.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ldmN6empkdnhwcWllenFkaG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjEzMTQsImV4cCI6MjA5ODIzNzMxNH0.w3auuu4zbhIzmwt33JkI2br34XKn5QnIce_IZT08XyY>
```

> Alternatif: edit langsung `defaultValue` di `lib/core/config.dart` bila tidak
> mau memakai `--dart-define`. `flutter create .` **tidak** menimpa `lib/` & `pubspec.yaml`.

## Supabase Storage (WAJIB sebelum pakai tanda tangan)
Jalankan **`../supabase/storage_setup.sql`** di Supabase SQL Editor (sekali).
Skrip itu membuat bucket `signatures`, `bukti`, `backups` **beserta RLS policy
upload**-nya. Tanpa policy ini, upload tanda tangan dari mobile gagal `403`
sehingga sesi tidak bisa dikunci. (Bucket publik saja tidak cukup — INSERT ke
`storage.objects` tetap perlu policy.)

## Build APK untuk distribusi
Cara mudah: `powershell -ExecutionPolicy Bypass -File .\build_apk.ps1`

Manual:
```bash
flutter build apk --release \
  --dart-define=SUPABASE_URL=https://nevczzjdvxpqiezqdhox.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<ANON_KEY>
# Output: build/app/outputs/flutter-apk/app-release.apk
```
APK ini bisa dikirim ke HP (mis. via WhatsApp) lalu diinstal langsung — berguna
untuk mendemokan aplikasi mobile ke pembeli tanpa perlu PC.

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
