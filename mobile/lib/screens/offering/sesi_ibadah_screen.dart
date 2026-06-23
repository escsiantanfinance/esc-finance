import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/finance_provider.dart';
import 'buka_sesi_screen.dart';

class SesiIbadahScreen extends StatefulWidget {
  const SesiIbadahScreen({super.key});
  @override
  State<SesiIbadahScreen> createState() => _SesiIbadahScreenState();
}

class _SesiIbadahScreenState extends State<SesiIbadahScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final fin = context.read<FinanceProvider>();
      fin.loadSesi();
      fin.ensureKasKategori();
    });
  }

  @override
  Widget build(BuildContext context) {
    final fin = context.watch<FinanceProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Sesi Ibadah')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => const BukaSesiScreen()));
          if (mounted) context.read<FinanceProvider>().loadSesi();
        },
        icon: const Icon(Icons.add),
        label: const Text('Buka sesi'),
      ),
      body: RefreshIndicator(
        onRefresh: () => context.read<FinanceProvider>().loadSesi(),
        child: fin.sesiList.isEmpty
            ? ListView(children: [const SizedBox(height: 80), Center(child: Text('Belum ada sesi ibadah', style: TextStyle(color: AppColors.muted)))])
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: fin.sesiList.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) {
                  final s = fin.sesiList[i];
                  return Card(
                    child: ListTile(
                      title: Text(s.jenisIbadah, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text('${s.tanggal} · ${formatRupiah(s.totalFisik)}'),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          _badge(s.isMatch ? 'MATCH' : 'MISMATCH', s.isMatch ? AppColors.success : AppColors.danger),
                          const SizedBox(height: 4),
                          Text(s.isLocked ? '🔒 Terkunci' : s.status,
                              style: TextStyle(fontSize: 11, color: AppColors.muted)),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }

  Widget _badge(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
        child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
      );
}
