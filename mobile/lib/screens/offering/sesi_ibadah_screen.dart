import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/finance_provider.dart';
import '../../providers/sesi_draft_provider.dart';
import 'buka_sesi_screen.dart';
import 'input_kategori_screen.dart';

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
          if (context.mounted) context.read<FinanceProvider>().loadSesi();
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
                  final locked = s.isLocked;
                  return Card(
                    child: ListTile(
                      onTap: locked
                          ? () => ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('🔒 Sesi sudah terkunci — tidak bisa diubah')))
                          : () => _resume(s),
                      title: Text(s.judul, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text('${s.judul != s.jenisIbadah ? '${s.jenisIbadah} · ' : ''}${s.tanggal} · ${formatRupiah(s.totalFisik)}'
                          '${locked ? '' : ' · ketuk untuk lanjutkan'}'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              _badge(s.isMatch ? 'MATCH' : 'MISMATCH', s.isMatch ? AppColors.success : AppColors.danger),
                              const SizedBox(height: 4),
                              Text(locked ? '🔒 Terkunci' : s.status,
                                  style: TextStyle(fontSize: 11, color: AppColors.muted)),
                            ],
                          ),
                          if (!locked)
                            PopupMenuButton<String>(
                              onSelected: (v) {
                                if (v == 'lanjut') _resume(s);
                                if (v == 'hapus') _confirmDelete(s);
                              },
                              itemBuilder: (_) => const [
                                PopupMenuItem(value: 'lanjut', child: Text('Lanjutkan')),
                                PopupMenuItem(value: 'hapus', child: Text('Hapus', style: TextStyle(color: AppColors.danger))),
                              ],
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }

  Future<void> _resume(SesiIbadah s) async {
    final draft = context.read<SesiDraftProvider>();
    final fin = context.read<FinanceProvider>();
    await fin.ensureKasKategori();
    await draft.resumeExisting(s, fin.kategoriPersembahan);
    if (!mounted) return;
    await Navigator.push(context, MaterialPageRoute(builder: (_) => const InputKategoriScreen()));
    if (mounted) context.read<FinanceProvider>().loadSesi();
  }

  Future<void> _confirmDelete(SesiIbadah s) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Hapus sesi?'),
        content: Text('Sesi "${s.judul}" (${s.tanggal}) beserta denominasi & kategorinya akan dihapus permanen.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Hapus', style: TextStyle(color: AppColors.danger))),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await context.read<FinanceProvider>().deleteSesi(s.id);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sesi dihapus')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal hapus: $e')));
    }
  }

  Widget _badge(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
        child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
      );
}
