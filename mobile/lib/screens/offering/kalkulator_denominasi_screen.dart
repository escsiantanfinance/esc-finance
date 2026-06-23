import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/sesi_draft_provider.dart';
import 'input_kategori_screen.dart';

class KalkulatorDenominasiScreen extends StatelessWidget {
  const KalkulatorDenominasiScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final draft = context.watch<SesiDraftProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Kalkulator Denominasi')),
      bottomNavigationBar: _bottomBar(context, draft),
      body: ListView(
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
                    Expanded(
                      child: TextFormField(
                        initialValue: lembar == 0 ? '' : lembar.toString(),
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        decoration: const InputDecoration(hintText: '0 lembar', isDense: true),
                        onChanged: (v) => draft.setLembar(nominal, int.tryParse(v) ?? 0),
                      ),
                    ),
                    SizedBox(
                      width: 110,
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
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: draft.totalFisik <= 0
                    ? null
                    : () async {
                        await draft.syncDenominasi();
                        if (context.mounted) {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const InputKategoriScreen()));
                        }
                      },
                child: const Text('Lanjut ke kategori'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
