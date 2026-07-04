import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/supabase_client.dart';
import 'core/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/finance_provider.dart';
import 'providers/sesi_draft_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseService.init();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..bootstrap()),
        ChangeNotifierProvider(create: (_) => FinanceProvider()),
        ChangeNotifierProvider(create: (_) => SesiDraftProvider()),
      ],
      child: const ESCFinanceApp(),
    ),
  );
}

class ESCFinanceApp extends StatelessWidget {
  const ESCFinanceApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ESC Finance',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const RootGate(),
    );
  }
}

/// Penentu layar awal: splash bermerek → login / home sesuai status auth.
class RootGate extends StatelessWidget {
  const RootGate({super.key});
  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        final Widget screen;
        if (auth.loading) {
          screen = const _SplashScreen();
        } else if (auth.isLoggedIn) {
          screen = const HomeShell();
        } else {
          screen = const LoginScreen();
        }
        return AnimatedSwitcher(
          duration: const Duration(milliseconds: 350),
          switchInCurve: Curves.easeOut,
          switchOutCurve: Curves.easeIn,
          child: screen,
        );
      },
    );
  }
}

/// Splash dengan identitas brand — tidak ada "kedipan" layar putih
/// di antara splash, login, dan halaman utama.
class _SplashScreen extends StatelessWidget {
  const _SplashScreen();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppGradients.brand),
        child: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const BrandMark(),
                      const SizedBox(height: 20),
                      const Text(
                        'ESC Finance',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Aplikasi Tim Finance',
                        style: TextStyle(color: Colors.white.withOpacity(0.75), fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 48),
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white.withOpacity(0.8)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
