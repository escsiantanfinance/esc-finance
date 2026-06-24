# =====================================================================
# ESC Siantan Finance - Setup Mobile (Windows) - SEKALI JALAN
# Generate folder platform Android + ambil dependency + cek kode.
# Cara pakai (dari folder mobile):
#   powershell -ExecutionPolicy Bypass -File .\setup_windows.ps1
# =====================================================================
$ErrorActionPreference = 'Stop'
Write-Host "== ESC Siantan Finance - Setup Mobile ==" -ForegroundColor Cyan

# 1) Pastikan Flutter terpasang
$flutter = Get-Command flutter -ErrorAction SilentlyContinue
if (-not $flutter) {
  Write-Host "`n[X] Flutter belum terpasang / belum ada di PATH." -ForegroundColor Red
  Write-Host "    Pasang dulu (Windows): https://docs.flutter.dev/get-started/install/windows"
  Write-Host "    Setelah itu jalankan lagi skrip ini."
  exit 1
}
Write-Host "`n[1/4] Flutter ditemukan:" -ForegroundColor Green
flutter --version

# 2) Generate folder platform Android (TIDAK menimpa lib/ & pubspec.yaml)
Write-Host "`n[2/4] Membuat folder platform Android..." -ForegroundColor Yellow
flutter create --org com.escsiantan --project-name esc_siantan_finance --platforms=android .

# 2b) Polish: nama aplikasi di home screen + workaround build Kotlin (Windows)
$manifest = "android\app\src\main\AndroidManifest.xml"
if (Test-Path $manifest) {
  (Get-Content $manifest -Raw) -replace 'android:label="esc_siantan_finance"', 'android:label="ESC Finance"' |
    Set-Content $manifest -Encoding UTF8
}
# Generate ikon launcher (church + koin Rp) bila asset & paket tersedia
if (Test-Path "assets\icon\esc_icon_full.png") {
  flutter pub run flutter_launcher_icons 2>&1 | Out-Null
}
$gp = "android\gradle.properties"
if (Test-Path $gp) {
  if ((Get-Content $gp -Raw) -notmatch 'kotlin\.incremental=false') {
    Add-Content $gp "`nkotlin.incremental=false`nkotlin.compiler.execution.strategy=in-process"
  }
}

# 3) Ambil dependency
Write-Host "`n[3/4] Mengambil dependency (flutter pub get)..." -ForegroundColor Yellow
flutter pub get

# 4) Cek kesehatan kode
Write-Host "`n[4/4] Menganalisis kode (flutter analyze)..." -ForegroundColor Yellow
flutter analyze

Write-Host "`n[OK] Setup selesai." -ForegroundColor Green
Write-Host "Langkah berikutnya:" -ForegroundColor Cyan
Write-Host "  - Sambungkan HP Android (USB debugging) atau jalankan emulator, lalu:"
Write-Host "      .\run_mobile.ps1        (jalankan langsung ke perangkat)"
Write-Host "  - Atau buat file APK untuk diinstal manual:"
Write-Host "      .\build_apk.ps1"
