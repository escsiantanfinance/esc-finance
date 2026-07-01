import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/finance_provider.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/finance_provider.dart';
import '../../providers/sesi_draft_provider.dart';
import 'balancing_signature_screen.dart';
import 'stepper_header.dart';
import 'stepper_header.dart';

/// Pengeluaran tunai langsung dari uang yang dihitung saat sesi ("Kartu Biru"
/// di form kertas). Ikut rekonsiliasi (fisik = kategori − pengeluaran) lalu
/// ditinjau Super Admin / Majelis terpisah sebelum memengaruhi jurnal & saldo.
class KartuBiruScreen extends StatefulWidget {
  const KartuBiruScreen({super.key});
  @override
  State<KartuBiruScreen> createState() => _KartuBiruScreenState();
}

class _KartuBiruScreenState extends State<KartuBiruScreen> {
  bool _saving = false;

  @override
  Widget build(BuildContext context) {
    final draft = context.watch<SesiDraftProvider>();
    final fin = context.watch<FinanceProvider>();
    final auth = context.watch<AuthProvider>();
    final fullAccess = auth.profile?.isFullAccess ?? false;
    final kasOptions = fin.kasUntuk(fullAccess);

    return Scaffold(
      appBar: AppBar(title: const Text('Pengeluaran')),
      bottomNavigationBar: _bottomBar(context, draft),
      body: Column(
        children: [
          const StepperHeader(step: 3),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'Catat pengeluaran tunai langsung dari uang yang dihitung (opsional). '
                  'Akan ditinjau Super Admin / Majelis sebelum masuk jurnal.',
                  style: TextStyle(color: AppColors.muted, fontSize: 13),
                ),
                const SizedBox(height: 12),
                ...draft.pengeluaran.asMap().entries.map((e) => _pengeluaranCard(draft, fin, kasOptions, e.key, e.value)),
                const SizedBox(height: 4),
                OutlinedButton.icon(
                  onPressed: () => draft.addPengeluaran(),
                  icon: const Icon(Icons.add),
                  label: const Text('Tambah pengeluaran'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _pengeluaranCard(
    SesiDraftProvider draft,
    FinanceProvider fin,
    List<Kas> kasOptions,
    int index,
    PengeluaranInput p,
  ) {
    // Key dipakai berdasar identitas objek (bukan index) agar field tidak
    // salah pasang nilai ketika sebuah baris di tengah dihapus.
    final keyId = identityHashCode(p);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    key: ValueKey('ket-$keyId'),
                    initialValue: p.keterangan,
                    decoration: const InputDecoration(labelText: 'Keterangan', isDense: true),
                    onChanged: (v) => draft.updatePengeluaran(index, keterangan: v),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                  onPressed: () => draft.removePengeluaran(index),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    key: ValueKey('jml-$keyId'),
                    initialValue: p.jumlah == 0 ? '' : p.jumlah.toStringAsFixed(0),
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Jumlah', prefixText: 'Rp ', isDense: true),
                    onChanged: (v) => draft.updatePengeluaran(index, jumlah: double.tryParse(v) ?? 0),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    key: ValueKey('pen-$keyId'),
                    initialValue: p.penerima ?? '',
                    decoration: const InputDecoration(labelText: 'Penerima (opsional)', isDense: true),
                    onChanged: (v) => draft.updatePengeluaran(index, penerima: v),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    key: ValueKey('katp-$keyId'),
                    initialValue: p.kategoriId,
                    decoration: const InputDecoration(labelText: 'Kategori', isDense: true),
                    items: fin.kategori
                        .map((k) => DropdownMenuItem(value: k.id, child: Text(k.nama, overflow: TextOverflow.ellipsis)))
                        .toList(),
                    onChanged: (v) => draft.updatePengeluaran(index, kategoriId: v),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    key: ValueKey('kas-$keyId'),
                    initialValue: p.kasId,
                    decoration: const InputDecoration(labelText: 'Kas asal', isDense: true),
                    items: kasOptions
                        .map((k) => DropdownMenuItem(value: k.id, child: Text(k.nama, overflow: TextOverflow.ellipsis)))
                        .toList(),
                    onChanged: (v) => draft.updatePengeluaran(index, kasId: v),
                  ),
                ),
              ],
            ),
          ],
        ),
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
                const Text('Total pengeluaran', style: TextStyle(fontWeight: FontWeight.w600)),
                Text(formatRupiah(draft.totalPengeluaran),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.danger)),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving
                    ? null
                    : () async {
                        setState(() => _saving = true);
                        await draft.syncPengeluaran();
                        if (context.mounted) {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const BalancingSignatureScreen()));
                        }
                        if (mounted) setState(() => _saving = false);
                      },
                child: Text(_saving ? 'Menyimpan…' : 'Lanjut ke balancing'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
