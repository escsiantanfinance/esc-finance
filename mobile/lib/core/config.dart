/// Konfigurasi Supabase.
/// Isi lewat --dart-define saat run/build, atau ganti defaultValue di bawah.
///
/// Contoh:
///   flutter run --dart-define=SUPABASE_URL=https://xxx.supabase.co \
///               --dart-define=SUPABASE_ANON_KEY=eyJ...
class AppConfig {
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://YOUR_PROJECT_ID.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'YOUR_ANON_KEY',
  );

  /// Bucket Storage untuk gambar tanda tangan
  static const String signaturesBucket = 'signatures';
}
