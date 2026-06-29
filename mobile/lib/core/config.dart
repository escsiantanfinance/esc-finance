/// Konfigurasi Supabase.
/// Isi lewat --dart-define saat run/build, atau ganti defaultValue di bawah.
///
/// Contoh:
///   flutter run --dart-define=SUPABASE_URL=https://xxx.supabase.co \
///               --dart-define=SUPABASE_ANON_KEY=eyJ...
class AppConfig {
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://nevczzjdvxpqiezqdhox.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ldmN6empkdnhwcWllenFkaG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NjEzMTQsImV4cCI6MjA5ODIzNzMxNH0.w3auuu4zbhIzmwt33JkI2br34XKn5QnIce_IZT08XyY',
  );

  /// Bucket Storage untuk gambar tanda tangan
  static const String signaturesBucket = 'signatures';
}
