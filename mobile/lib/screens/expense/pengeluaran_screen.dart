import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/finance_provider.dart';

class PengeluaranScreen extends StatefulWidget {
  const PengeluaranScreen({super.key});
  @override
  State<PengeluaranScreen> createState() => _PengeluaranScreenState();
}

class _PengeluaranScreenState extends State<PengeluaranScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final fin = context.read<FinanceProvider>();
      fin.loadPengeluaran();
      fin.ensureKasKategori();
    });
  }

  Color _statusColor(String s) =>
      s == 'disetujui' ? AppColors.success : (s == 'ditolak' ? AppColors.danger : AppColors.gold);

  @override
  Widget build(BuildContext context) {
    final fin = context.watch<FinanceProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Pengeluaran')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddSheet(context),
        icon: const Icon(Icons.add),
        label: const Text('Ajukan'),
      ),
      body: RefreshIndicator(
        onRefresh: () => context.read<FinanceProvider>().loadPengeluaran(),
        child: fin.pengeluaran.isEmpty
            ? ListView(children: [const SizedBox(height: 80), Center(child: Text('Belum ada pengeluaran', style: TextStyle(color: AppColors.muted)))])
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: fin.pengeluaran.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) {
                  final p = fin.pengeluaran[i];
                  return Card(
                    child: ListTile(
                      title: Text(p.keterangan, maxLines: 1, overflow: TextOverflow.ellipsis),
                      subtitle: Text('${p.tanggal} · ${p.kategoriNama ?? '-'}'),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(formatRupiah(p.jumlah),
                              style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold)),
                          Text(p.status, style: TextStyle(color: _statusColor(p.status), fontSize: 12)),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }

  void _showAddSheet(BuildContext context) {
    final fin = context.read<FinanceProvider>();
    final fullAccess = context.read<AuthProvider>().profile?.isFullAccess ?? false;
    final kasOptions = fin.kasUntuk(fullAccess);
    final ketC = TextEditingController();
    final jmlC = TextEditingController();
    String? kategoriId = fin.kategori.isNotEmpty ? fin.kategori.first.id : null;
    String? kasId = kasOptions.isNotEmpty ? kasOptions.first.id : null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: StatefulBuilder(
          builder: (ctx, setSheet) => Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Ajukan Pengeluaran', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 14),
                TextField(controller: ketC, decoration: const InputDecoration(labelText: 'Keterangan')),
                const SizedBox(height: 10),
                TextField(controller: jmlC, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Jumlah (Rp)')),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: kategoriId,
                  decoration: const InputDecoration(labelText: 'Kategori'),
                  items: fin.kategori.map((k) => DropdownMenuItem(value: k.id, child: Text(k.nama))).toList(),
                  onChanged: (v) => setSheet(() => kategoriId = v),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: kasId,
                  decoration: const InputDecoration(labelText: 'Kas asal'),
                  items: kasOptions.map((k) => DropdownMenuItem(value: k.id, child: Text(k.nama))).toList(),
                  onChanged: (v) => setSheet(() => kasId = v),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      final jumlah = double.tryParse(jmlC.text) ?? 0;
                      if (ketC.text.isEmpty || jumlah <= 0 || kategoriId == null || kasId == null) return;
                      await fin.repo.createPengeluaran(
                        tanggal: DateTime.now().toIso8601String().substring(0, 10),
                        kategoriId: kategoriId!,
                        kasId: kasId!,
                        jumlah: jumlah,
                        keterangan: ketC.text,
                      );
                      if (ctx.mounted) Navigator.pop(ctx);
                      fin.loadPengeluaran();
                    },
                    child: const Text('Kirim pengajuan'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
