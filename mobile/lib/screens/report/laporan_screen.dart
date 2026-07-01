import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/finance_provider.dart';

import '../../providers/auth_provider.dart';

class LaporanScreen extends StatefulWidget {
  const LaporanScreen({super.key});
  @override
  State<LaporanScreen> createState() => _LaporanScreenState();
}

class _LaporanScreenState extends State<LaporanScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final fullAccess = context.read<AuthProvider>().profile?.isFullAccess ?? false;
      context.read<FinanceProvider>().loadDashboard(fullAccess);
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<FinanceProvider>().summary;
    final surplus = (s?.pemasukanBulanIni ?? 0) - (s?.pengeluaranBulanIni ?? 0);

    return Scaffold(
      appBar: AppBar(title: const Text('Laporan')),
      body: RefreshIndicator(
        onRefresh: () async {
          final fullAccess = context.read<AuthProvider>().profile?.isFullAccess ?? false;
          await context.read<FinanceProvider>().loadDashboard(fullAccess);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Ringkasan bulan ini', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _ReportCard(label: 'Total pemasukan', value: formatRupiah(s?.pemasukanBulanIni), color: AppColors.success),
            const SizedBox(height: 10),
            _ReportCard(label: 'Total pengeluaran', value: formatRupiah(s?.pengeluaranBulanIni), color: AppColors.danger),
            const SizedBox(height: 10),
            _ReportCard(label: surplus >= 0 ? 'Surplus' : 'Defisit', value: formatRupiah(surplus), color: AppColors.primary),
            const SizedBox(height: 10),
            _ReportCard(label: 'Total saldo kas', value: formatRupiah(s?.totalSaldo), color: AppColors.ink),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(12)),
              child: Text(
                'ℹ️ Laporan lengkap (Laporan Aktivitas, Neraca, Arus Kas) tersedia di Web Dashboard Admin.',
                style: TextStyle(color: AppColors.primary, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final String label, value;
  final Color color;
  const _ReportCard({required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: AppColors.muted, fontSize: 13)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
