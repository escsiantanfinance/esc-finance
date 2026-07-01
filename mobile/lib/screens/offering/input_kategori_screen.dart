import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/finance_provider.dart';
import '../../providers/sesi_draft_provider.dart';
import 'kalkulator_denominasi_screen.dart';
import 'stepper_header.dart';

class InputKategoriScreen extends StatefulWidget {
  const InputKategoriScreen({super.key});
  @override
  State<InputKategoriScreen> createState() => _InputKategoriScreenState();
}

class _InputKategoriScreenState extends State<InputKategoriScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FinanceProvider>().ensureKasKategori();
    });
  }

  @override
  Widget build(BuildContext context) {
    final draft = context.watch<SesiDraftProvider>();
    final fin = context.watch<FinanceProvider>();
    final auth = context.watch<AuthProvider>();
    final fullAccess = auth.profile?.isFullAccess ?? false;
    final daftarKategori = fin.kategoriPersembahanUntuk(fullAccess);

    return Scaffold(
      appBar: AppBar(title: const Text('Input Kategori')),
      bottomNavigationBar: _bottomBar(context, draft),
      body: Column(
        children: [
          const StepperHeader(step: 1),
          Expanded(
            child: daftarKategori.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(32),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.folder_open, size: 64, color: AppColors.muted),
                          const SizedBox(height: 16),
                          Text(
                            fin.kategoriPersembahan.isEmpty
                                ? 'Belum ada kategori persembahan. Hubungi Super Admin untuk menambahkannya di web.'
                                : 'Anda belum diberi akses kas untuk kategori manapun. Hubungi Super Admin.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.muted, fontSize: 16),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text('Pilih kategori yang dihitung pada sesi ini, lalu isi jumlahnya.',
                          style: TextStyle(color: AppColors.muted, fontSize: 13)),
                      const SizedBox(height: 12),
                      ...daftarKategori.map((k) => _kategoriCard(draft, k)),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _kategoriCard(SesiDraftProvider draft, KategoriPersembahan k) {
    final selected = draft.isKategoriSelected(k.id);
    final entry = selected ? draft.kategori.firstWhere((e) => e.kategoriId == k.id) : null;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: selected,
              onChanged: (v) => draft.toggleKategori(k, v ?? false),
              title: Text(k.nama, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(k.kasNama != null ? '→ ${k.kasNama}' : 'kas belum diatur',
                  style: TextStyle(fontSize: 12, color: AppColors.muted)),
            ),
            if (selected && entry != null) ...[
              const Divider(height: 1),
              const SizedBox(height: 8),
              entry.butuhNama ? _namaList(draft, entry) : _totalField(draft, entry),
              const SizedBox(height: 8),
            ],
          ],
        ),
      ),
    );
  }

  Widget _totalField(SesiDraftProvider draft, KategoriEntry entry) {
    return TextFormField(
      key: ValueKey('total-${entry.kategoriId}'),
      initialValue: entry.total == 0 ? '' : entry.total.toStringAsFixed(0),
      keyboardType: TextInputType.number,
      decoration: const InputDecoration(prefixText: 'Rp ', hintText: '0', isDense: true),
      onChanged: (v) => draft.setKategoriTotal(entry.kategoriId, double.tryParse(v) ?? 0),
    );
  }

  Widget _namaList(SesiDraftProvider draft, KategoriEntry entry) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...entry.items.asMap().entries.map((e) {
          final i = e.key;
          final item = e.value;
          // Key dipakai berdasar identitas objek (bukan index) agar TextFormField
          // tidak salah pasang nilai ketika sebuah baris di tengah dihapus.
          final keyId = identityHashCode(item);
          return Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: TextFormField(
                    key: ValueKey('nama-$keyId'),
                    initialValue: item.nama,
                    decoration: const InputDecoration(hintText: 'Nama (opsional)', isDense: true),
                    onChanged: (v) => draft.setNamaItem(entry.kategoriId, i, nama: v),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    key: ValueKey('jumlah-$keyId'),
                    initialValue: item.jumlah == 0 ? '' : item.jumlah.toStringAsFixed(0),
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(prefixText: 'Rp ', hintText: '0', isDense: true),
                    onChanged: (v) => draft.setNamaItem(entry.kategoriId, i, jumlah: double.tryParse(v) ?? 0),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: () => draft.removeNamaItem(entry.kategoriId, i),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
              ],
            ),
          );
        }),
        TextButton.icon(
          onPressed: () => draft.addNamaItem(entry.kategoriId),
          icon: const Icon(Icons.add, size: 16),
          label: const Text('Tambah nama'),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: Text('Subtotal: ${formatRupiah(entry.jumlah)}',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ),
      ],
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
                const Text('Total kategori', style: TextStyle(fontWeight: FontWeight.w600)),
                Text(formatRupiah(draft.totalKategori),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary)),
              ],
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
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const KalkulatorDenominasiScreen()));
                        }
                      },
                child: const Text('Lanjut ke kalkulator'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
