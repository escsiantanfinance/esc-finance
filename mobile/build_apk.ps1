# =====================================================================
# Build APK rilis untuk dibagikan / diinstal manual ke HP Android.
# Cara pakai:  powershell -ExecutionPolicy Bypass -File .\build_apk.ps1
# =====================================================================
$URL  = "https://vtupgtrlsydiunpiqiui.supabase.co"
$ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0dXBndHJsc3lkaXVucGlxaXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTU1MzYsImV4cCI6MjA5Nzc5MTUzNn0.2r4JjfPYTITgdw5-0hDLxc4QonIV_SnGOBoETCJyI50"

# Pastikan Android SDK terbaca walau dijalankan di shell baru
if (-not $env:ANDROID_HOME)     { $env:ANDROID_HOME     = "$env:LOCALAPPDATA\Android\Sdk" }
if (-not $env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk" }

# Pastikan workaround Kotlin ada di gradle.properties (hilang bila flutter create
# regenerasi folder android). Mencegah error "Could not close incremental caches".
$gp = "android\gradle.properties"
if (Test-Path $gp) {
  $gpText = Get-Content $gp -Raw
  if ($gpText -notmatch 'kotlin\.incremental=false') {
    Add-Content $gp "`nkotlin.incremental=false`nkotlin.compiler.execution.strategy=in-process"
    Write-Host "[i] Menambahkan workaround Kotlin ke gradle.properties" -ForegroundColor DarkGray
  }
}

# Catatan: --no-tree-shake-icons WAJIB di sebagian Windows (Smart App Control
# memblokir font-subset.exe milik Flutter saat optimasi ikon). APK sedikit lebih
# besar (~1 MB) tapi build berjalan normal.
flutter build apk --release --no-tree-shake-icons `
  --dart-define=SUPABASE_URL=$URL `
  --dart-define=SUPABASE_ANON_KEY=$ANON

if ($LASTEXITCODE -ne 0) {
  Write-Host "`n[X] Build GAGAL (exit $LASTEXITCODE). Lihat pesan error di atas." -ForegroundColor Red
  exit $LASTEXITCODE
}

$apk = "build\app\outputs\flutter-apk\app-release.apk"
if (Test-Path $apk) {
  $mb = [math]::Round((Get-Item $apk).Length / 1MB, 1)
  Write-Host "`n[OK] APK siap ($mb MB): $apk" -ForegroundColor Green
  Write-Host "Kirim file itu ke HP, lalu instal (aktifkan 'Install from unknown sources')."
} else {
  Write-Host "`n[X] Build melaporkan sukses tapi file APK tidak ditemukan." -ForegroundColor Red
  exit 1
}
