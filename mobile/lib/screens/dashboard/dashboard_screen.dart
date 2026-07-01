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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Beranda'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Keluar',
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Konfirmasi'),
                  content: const Text('Apakah Anda yakin ingin keluar?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
                    TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Keluar')),
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
      body: RefreshIndicator(
        onRefresh: () async {
          final fullAccess = context.read<AuthProvider>().profile?.isFullAccess ?? false;
          await context.read<FinanceProvider>().loadDashboard(fullAccess);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Selamat datang,', style: TextStyle(color: AppColors.muted)),
            Text(auth.profile?.fullName ?? '-',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            // Saldo — per-kas untuk bendahara, total untuk admin/super admin
            if (!fullAccess && kasList.isNotEmpty)
              ...kasList.map((k) => Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(16)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(k.nama,
                            style: const TextStyle(
                                color: Color(0xFFBFDBFE), fontSize: 14)),
                        const SizedBox(height: 4),
                        Text(formatRupiah(k.saldoSaatIni),
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ))
            else
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(16)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total saldo kas',
                        style: TextStyle(color: Color(0xFFBFDBFE))),
                    const SizedBox(height: 4),
                    Text(formatRupiah(s?.totalSaldo),
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 26,
                            fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            if (fullAccess)
              Row(
                children: [
                  _MiniStat(
                      label: 'Masuk bln ini',
                      value: formatRupiah(s?.pemasukanBulanIni),
                      color: AppColors.success),
                  const SizedBox(width: 12),
                  _MiniStat(
                      label: 'Keluar bln ini',
                      value: formatRupiah(s?.pengeluaranBulanIni),
                      color: AppColors.danger),
                ],
              ),
            const SizedBox(height: 20),
            const Text('Aksi cepat',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.6,
              children: [
                _ActionCard(
                  icon: '💵',
                  label: 'Buka sesi ibadah',
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const BukaSesiScreen())),
                ),
                _ActionCard(
                  icon: '🧾',
                  label: 'Pengeluaran',
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const PengeluaranScreen())),
                ),
                _ActionCard(
                  icon: '📊',
                  label: 'Laporan',
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const LaporanScreen())), 
                ),
                _ActionCard(
                  icon: '💳',
                  label: 'Sesi Ibadah', // Ganti Saldo Kas jadi Sesi Ibadah
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const SesiIbadahScreen())), 
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label, value;
  final Color color;
  const _MiniStat({required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: AppColors.muted, fontSize: 12)),
            const SizedBox(height: 4),
            Text(value,
                style: TextStyle(
                    color: color, fontWeight: FontWeight.bold, fontSize: 15)),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final String icon, label;
  final VoidCallback onTap;
  const _ActionCard({required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(icon, style: const TextStyle(fontSize: 26)),
            const SizedBox(height: 6),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
