# =====================================================================
# Jalankan aplikasi ke perangkat/emulator Android yang terhubung.
# Kredensial Supabase sudah terisi (anon key = aman dipakai di client).
# Ganti $URL/$ANON bila memakai project Supabase lain.
# Cara pakai:  powershell -ExecutionPolicy Bypass -File .\run_mobile.ps1
# =====================================================================
$URL  = "https://nevczzjdvxpqiezqdhox.supabase.co"
$ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ldmN6empkdnhwcWllenFkaG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjEzMTQsImV4cCI6MjA5ODIzNzMxNH0.w3auuu4zbhIzmwt33JkI2br34XKn5QnIce_IZT08XyY"

# Pastikan Android SDK terbaca walau dijalankan di shell baru
if (-not $env:ANDROID_HOME)     { $env:ANDROID_HOME     = "$env:LOCALAPPDATA\Android\Sdk" }
if (-not $env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk" }

flutter run --no-tree-shake-icons --dart-define=SUPABASE_URL=$URL --dart-define=SUPABASE_ANON_KEY=$ANON
