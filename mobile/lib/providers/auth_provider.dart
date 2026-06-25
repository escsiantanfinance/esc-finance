import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show AuthException;
import '../data/finance_repository.dart';
import '../models/models.dart';

class AuthProvider extends ChangeNotifier {
  final _repo = FinanceRepository();
  Profile? profile;
  bool loading = true;
  String? error;

  bool get isLoggedIn => profile != null;

  Future<void> bootstrap() async {
    loading = true;
    notifyListeners();
    try {
      profile = await _repo.currentProfile();
    } catch (_) {
      profile = null;
    }
    loading = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    error = null;
    notifyListeners();
    try {
      await _repo.login(email.trim(), password);
      profile = await _repo.currentProfile();
      notifyListeners();
      return true;
    } on AuthException catch (e) {
      error = e.message.toLowerCase().contains('invalid')
          ? 'Email atau kata sandi salah.'
          : 'Gagal masuk: ${e.message}';
      notifyListeners();
      return false;
    } catch (e) {
      error = 'Tidak bisa terhubung: $e';
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    profile = null;
    notifyListeners();
  }
}
