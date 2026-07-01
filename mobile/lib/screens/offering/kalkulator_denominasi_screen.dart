import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/sesi_draft_provider.dart';
import 'kartu_biru_screen.dart';
import 'stepper_header.dart';

class KalkulatorDenominasiScreen extends StatelessWidget {
  const KalkulatorDenominasiScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final draft = context.watch<SesiDraftProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Kalkulator Denominasi')),
      bottomNavigationBar: _bottomBar(context, draft),
      body: Column(
        children: [
          const StepperHeader(step: 2),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('Masukkan jumlah lembar tiap pecahan. Total dihitung otomatis.',
                    style: TextStyle(color: AppColors.muted, fontSize: 13)),
                const SizedBox(height: 12),
                ...kDenominations.map((nominal) {
                  final lembar = draft.pecahan[nominal] ?? 0;
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      child: Row(
                        children: [
                          SizedBox(width: 96, child: Text(formatRupiah(nominal), style: const TextStyle(fontWeight: FontWeight.w600))),
                          IconButton(
                            icon: const Icon(Icons.remove_circle_outline, color: AppColors.muted),
                            onPressed: lembar <= 0
                                ? null
                                : () {
                                    HapticFeedback.lightImpact();
                                    draft.setLembar(nominal, lembar - 1);
                                  },
                          ),
                          Text('$lembar', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          IconButton(
                            icon: const Icon(Icons.add_circle, color: AppColors.primary),
                            onPressed: () {
                              HapticFeedback.lightImpact();
                              draft.setLembar(nominal, lembar + 1);
                            },
                          ),
                          Expanded(
                            child: Text(formatRupiah(nominal * lembar),
                                textAlign: TextAlign.right,
                                style: const TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 12),
                Text('💾 Tersimpan otomatis di perangkat', style: TextStyle(color: AppColors.muted, fontSize: 12), textAlign: TextAlign.center),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _bottomBar(BuildContext context, SesiDraftProvider draft) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total fisik', style: TextStyle(fontWeight: FontWeight.w600)),
                Text(formatRupiah(draft.totalFisik),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary)),
              ],
            ),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerRight,
              child: Text('Kategori: ${formatRupiah(draft.totalKategori)}',
                  style: TextStyle(color: AppColors.muted, fontSize: 12)),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: draft.totalFisik <= 0
                    ? null
                    : () async {
                        await draft.syncDenominasi();
                        if (context.mounted) {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const KartuBiruScreen()));
                        }
                      },
                child: const Text('Lanjut ke pengeluaran'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
