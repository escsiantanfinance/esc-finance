import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/finance_provider.dart';
import '../offering/buka_sesi_screen.dart';
import '../offering/sesi_ibadah_screen.dart';
import '../expense/pengeluaran_screen.dart';
import '../report/laporan_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final fullAccess = context.read<AuthProvider>().profile?.isFullAccess ?? false;
      context.read<FinanceProvider>().loadDashboard(fullAccess);
      context.read<FinanceProvider>().ensureKasKategori();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final fin = context.watch<FinanceProvider>();
    final s = fin.summary;
    final fullAccess = auth.profile?.isFullAccess ?? false;
    final kasList = fin.kasUntuk(fullAccess);
    final firstName = (auth.profile?.fullName ?? '').split(' ').first;

    return Scaffold(
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async {
          final fa = context.read<AuthProvider>().profile?.isFullAccess ?? false;
          await context.read<FinanceProvider>().loadDashboard(fa);
        },
        child: CustomScrollView(
          slivers: [
            // ── Gradient SliverAppBar ──────────────────────────
            SliverAppBar(
              expandedHeight: 180,
              pinned: true,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF1E1B4B), Color(0xFF4F46E5), Color(0xFF7C3AED)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                            'Halo, ${firstName.isNotEmpty ? firstName : 'Pengguna'} 👋',
                            style: const TextStyle(color: Color(0xFFc7d2fe), fontSize: 13),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Selamat bekerja!',
                            style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              backgroundColor: AppColors.primaryDark,
              foregroundColor: Colors.white,
              actions: [
                IconButton(
                  icon: const Icon(Icons.logout_outlined),
                  tooltip: 'Keluar',
                  onPressed: () async {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        title: const Text('Konfirmasi Keluar', style: TextStyle(fontWeight: FontWeight.w700)),
                        content: const Text('Apakah Anda yakin ingin keluar dari aplikasi?'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
                          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Keluar')),
                        ],
                      ),
                    );
                    if (confirm == true) {
                      if (context.mounted) context.read<AuthProvider>().logout();
                    }
                  },
                ),
              ],
            ),

            // ── Konten ────────────────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Saldo Cards
                  if (!fullAccess && kasList.isNotEmpty)
                    ...kasList.map((k) => _SaldoCard(nama: k.nama, saldo: formatRupiah(k.saldoSaatIni)))
                  else
                    _SaldoCard(nama: 'Total Saldo Kas', saldo: formatRupiah(s?.totalSaldo), isTotal: true),

                  const SizedBox(height: 20),

                  // Mini Stats (admin only)
                  if (fullAccess) ...[
                    Row(children: [
                      _MiniStat(label: 'Masuk bln ini', value: formatRupiah(s?.pemasukanBulanIni), color: AppColors.success, icon: Icons.trending_up),
                      const SizedBox(width: 12),
                      _MiniStat(label: 'Keluar bln ini', value: formatRupiah(s?.pengeluaranBulanIni), color: AppColors.danger, icon: Icons.trending_down),
                    ]),
                    const SizedBox(height: 20),
                  ],

                  // Aksi Cepat
                  const _SectionTitle('Aksi Cepat'),
                  const SizedBox(height: 12),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.55,
                    children: [
                      _ActionCard(
                        icon: Icons.church_outlined,
                        label: 'Buka Sesi Ibadah',
                        gradient: const [Color(0xFF4F46E5), Color(0xFF6366F1)],
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BukaSesiScreen())),
                      ),
                      _ActionCard(
                        icon: Icons.receipt_long_outlined,
                        label: 'Pengeluaran',
                        gradient: const [Color(0xFFDC2626), Color(0xFFF87171)],
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PengeluaranScreen())),
                      ),
                      _ActionCard(
                        icon: Icons.bar_chart_outlined,
                        label: 'Laporan',
                        gradient: const [Color(0xFF059669), Color(0xFF34D399)],
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LaporanScreen())),
                      ),
                      _ActionCard(
                        icon: Icons.list_alt_outlined,
                        label: 'Sesi Ibadah',
                        gradient: const [Color(0xFFD97706), Color(0xFFFBBF24)],
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SesiIbadahScreen())),
                      ),
                    ],
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SaldoCard extends StatelessWidget {
  final String nama, saldo;
  final bool isTotal;
  const _SaldoCard({required this.nama, required this.saldo, this.isTotal = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isTotal
              ? [const Color(0xFF1E1B4B), const Color(0xFF4F46E5)]
              : [const Color(0xFF4F46E5), const Color(0xFF7C3AED)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.35),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(nama, style: const TextStyle(color: Color(0xFFc7d2fe), fontSize: 13, fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          Text(saldo,
              style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label, value;
  final Color color;
  final IconData icon;
  const _MiniStat({required this.label, required this.value, required this.color, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 16),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: TextStyle(color: AppColors.muted, fontSize: 10, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 2),
                  Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 13)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final List<Color> gradient;
  final VoidCallback onTap;
  const _ActionCard({required this.icon, required this.label, required this.gradient, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: gradient, begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: gradient.first.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Colors.white.withOpacity(0.9), size: 26),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, letterSpacing: -0.3));
}
