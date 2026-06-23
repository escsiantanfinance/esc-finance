import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/finance_provider.dart';

class AnggaranScreen extends StatefulWidget {
  const AnggaranScreen({super.key});
  @override
  State<AnggaranScreen> createState() => _AnggaranScreenState();
}

class _AnggaranScreenState extends State<AnggaranScreen> {
  final int _tahun = DateTime.now().year;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FinanceProvider>().loadAnggaran(_tahun);
    });
  }

  @override
  Widget build(BuildContext context) {
    final fin = context.watch<FinanceProvider>();
    final total = fin.anggaran.fold<double>(0, (s, a) => s + a.jumlahDianggarkan);

    return Scaffold(
      appBar: AppBar(title: Text('Anggaran $_tahun')),
      body: RefreshIndicator(
        onRefresh: () => context.read<FinanceProvider>().loadAnggaran(_tahun),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(16)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Total anggaran', style: TextStyle(color: Color(0xFFBFDBFE))),
                  const SizedBox(height: 4),
                  Text(formatRupiah(total),
                      style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (fin.anggaran.isEmpty)
              Padding(padding: const EdgeInsets.all(24), child: Center(child: Text('Belum ada anggaran', style: TextStyle(color: AppColors.muted))))
            else
              ...fin.anggaran.map((a) => Card(
                    child: ListTile(
                      title: Text(a.namaPos),
                      subtitle: Text('${a.kategoriNama ?? 'Umum'} · ${a.bulan == null ? 'Tahunan' : 'Bulan ${a.bulan}'}'),
                      trailing: Text(formatRupiah(a.jumlahDianggarkan),
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                    ),
                  )),
          ],
        ),
      ),
    );
  }
}
