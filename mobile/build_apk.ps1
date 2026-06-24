# =====================================================================
# Build APK rilis untuk dibagikan / diinstal manual ke HP Android.
# Cara pakai:  powershell -ExecutionPolicy Bypass -File .\build_apk.ps1
# =====================================================================
$URL  = "https://vtupgtrlsydiunpiqiui.supabase.co"
$ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0dXBndHJsc3lkaXVucGlxaXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTU1MzYsImV4cCI6MjA5Nzc5MTUzNn0.2r4JjfPYTITgdw5-0hDLxc4QonIV_SnGOBoETCJyI50"

flutter build apk --release --dart-define=SUPABASE_URL=$URL --dart-define=SUPABASE_ANON_KEY=$ANON
Write-Host "`n[OK] APK siap: build\app\outputs\flutter-apk\app-release.apk" -ForegroundColor Green
Write-Host "Kirim file itu ke HP, lalu instal (aktifkan 'Install from unknown sources')."
