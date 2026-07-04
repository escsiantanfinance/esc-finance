import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  String? _errorText;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _loading = true;
      _errorText = null;
    });
    final auth = context.read<AuthProvider>();
    final ok = await auth.login(_email.text.trim(), _password.text);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (!ok) _errorText = auth.error ?? 'Email atau kata sandi salah.';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryDark,
      body: Stack(
        children: [
          // Latar gradient brand + lingkaran dekoratif
          Container(decoration: const BoxDecoration(gradient: AppGradients.brand)),
          Positioned(
            top: -90,
            right: -70,
            child: _DecorCircle(size: 240, opacity: 0.08),
          ),
          Positioned(
            bottom: -110,
            left: -80,
            child: _DecorCircle(size: 300, opacity: 0.06),
          ),
          Positioned(
            top: 140,
            left: -50,
            child: _DecorCircle(size: 120, opacity: 0.07),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: 1),
                  duration: const Duration(milliseconds: 550),
                  curve: Curves.easeOutCubic,
                  builder: (context, t, child) => Opacity(
                    opacity: t,
                    child: Transform.translate(offset: Offset(0, 24 * (1 - t)), child: child),
                  ),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
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
                        const SizedBox(height: 32),
                        _buildCard(),
                        const SizedBox(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.lock_outline, size: 14, color: Colors.white.withOpacity(0.65)),
                            const SizedBox(width: 6),
                            Text(
                              'Koneksi aman terenkripsi',
                              style: TextStyle(color: Colors.white.withOpacity(0.65), fontSize: 12),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.18),
            blurRadius: 30,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: AutofillGroup(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Masuk ke Akun',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.ink),
              ),
              const SizedBox(height: 4),
              const Text(
                'Gunakan akun tim finance Anda',
                style: TextStyle(fontSize: 13, color: AppColors.muted),
              ),
              const SizedBox(height: 22),
              TextFormField(
                controller: _email,
                enabled: !_loading,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.username, AutofillHints.email],
                decoration: const InputDecoration(
                  labelText: 'Email',
                  hintText: 'bendahara@gereja.id',
                  prefixIcon: Icon(Icons.mail_outline, size: 20),
                ),
                validator: (v) {
                  final s = (v ?? '').trim();
                  if (s.isEmpty) return 'Email wajib diisi';
                  if (!s.contains('@') || !s.contains('.')) return 'Format email tidak valid';
                  return null;
                },
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _password,
                enabled: !_loading,
                obscureText: _obscure,
                textInputAction: TextInputAction.done,
                autofillHints: const [AutofillHints.password],
                onFieldSubmitted: (_) => _submit(),
                decoration: InputDecoration(
                  labelText: 'Kata sandi',
                  prefixIcon: const Icon(Icons.lock_outline, size: 20),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                      size: 20,
                      color: AppColors.muted,
                    ),
                    tooltip: _obscure ? 'Tampilkan kata sandi' : 'Sembunyikan kata sandi',
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
                validator: (v) => (v == null || v.isEmpty) ? 'Kata sandi wajib diisi' : null,
              ),
              // Pesan error inline — dekat dengan konteks, bukan snackbar
              AnimatedSize(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOut,
                child: _errorText == null
                    ? const SizedBox(width: double.infinity)
                    : Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(top: 14),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFFECACA)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, size: 18, color: AppColors.danger),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _errorText!,
                                style: const TextStyle(color: AppColors.danger, fontSize: 12.5),
                              ),
                            ),
                          ],
                        ),
                      ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    child: _loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Text('Masuk'),
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

class _DecorCircle extends StatelessWidget {
  final double size;
  final double opacity;
  const _DecorCircle({required this.size, required this.opacity});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withOpacity(opacity),
        ),
      ),
    );
  }
}
