import 'package:supabase_flutter/supabase_flutter.dart';
import 'config.dart';

/// Inisialisasi & akses singleton Supabase.
class SupabaseService {
  static Future<void> init() async {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabaseAnonKey,
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
  static GoTrueClient get auth => Supabase.instance.client.auth;
  static User? get currentUser => Supabase.instance.client.auth.currentUser;
}
