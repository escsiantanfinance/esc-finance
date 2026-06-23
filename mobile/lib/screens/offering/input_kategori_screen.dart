import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/sesi_draft_provider.dart';
import 'balancing_signature_screen.dart';

class InputKategoriScreen extends StatelessWidget {
  const InputKategoriScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final draft = context.watch<SesiDraftProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Input Kategori')),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total kategori', style: TextStyle(fontWeight: FontWeight.w600)),
                  Text(formatRupiah(draft.totalKategori),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary)),
                ],
              ),
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: Text('Fisik: ${formatRupiah(draft.totalFisik)}',
                    style: TextStyle(color: AppColors.muted, fontSize: 12)),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: draft.totalKategori <= 0
                      ? null
                      : () async {
                          await draft.syncKategori();
                          if (context.mounted) {
                            Navigator.push(context, MaterialPageRoute(builder: (_) => const BalancingSignatureScreen()));
                          }
                        },
                  child: const Text('Lanjut ke balancing'),
                ),
              ),
            ],
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Masukkan nominal per kategori persembahan.',
              style: TextStyle(color: AppColors.muted, fontSize: 13)),
          const SizedBox(height: 12),
          ...draft.kategori.map((k) => Card(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  child: Row(
                    children: [
                      Expanded(child: Text(kOfferingLabels[k.jenis] ?? k.jenis, style: const TextStyle(fontWeight: FontWeight.w600))),
                      SizedBox(
                        width: 150,
                        child: TextFormField(
                          initialValue: k.jumlah == 0 ? '' : k.jumlah.toStringAsFixed(0),
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.right,
                          decoration: const InputDecoration(hintText: '0', prefixText: 'Rp ', isDense: true),
                          onChanged: (v) => draft.setKategori(k.jenis, double.tryParse(v) ?? 0),
                        ),
                      ),
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
  }
}
