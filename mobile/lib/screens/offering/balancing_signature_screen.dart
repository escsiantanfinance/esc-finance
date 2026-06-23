import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:signature/signature.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/sesi_draft_provider.dart';

class BalancingSignatureScreen extends StatefulWidget {
  const BalancingSignatureScreen({super.key});
  @override
  State<BalancingSignatureScreen> createState() => _BalancingSignatureScreenState();
}

class _BalancingSignatureScreenState extends State<BalancingSignatureScreen> {
  final _gembalaName = TextEditingController();
  final _saksiName = TextEditingController();
  final _gembalaSig = SignatureController(penStrokeWidth: 2, penColor: Colors.black87);
  final _saksiSig = SignatureController(penStrokeWidth: 2, penColor: Colors.black87);
  bool _saving = false;

  @override
  void dispose() {
    _gembalaName.dispose();
    _saksiName.dispose();
    _gembalaSig.dispose();
    _saksiSig.dispose();
    super.dispose();
  }

  Future<void> _simpanKunci(SesiDraftProvider draft) async {
    if (!draft.isMatch) return;
    if (_gembalaName.text.isEmpty || _saksiName.text.isEmpty) {
      _toast('Nama Gembala & Saksi wajib diisi');
      return;
    }
    if (_gembalaSig.isEmpty || _saksiSig.isEmpty) {
      _toast('Kedua tanda tangan wajib diisi');
      return;
    }
    setState(() => _saving = true);
    try {
      final gBytes = await _gembalaSig.toPngBytes();
      final sBytes = await _saksiSig.toPngBytes();
      final gUrl = await draft.repo.uploadSignature(gBytes!, 'gembala');
      final sUrl = await draft.repo.uploadSignature(sBytes!, 'saksi');
      await draft.finalizeLock(
        namaGembala: _gembalaName.text,
        ttdGembalaUrl: gUrl,
        namaSaksi: _saksiName.text,
        ttdSaksiUrl: sUrl,
      );
      if (!mounted) return;
      Navigator.popUntil(context, (r) => r.isFirst);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✓ Sesi tersimpan & terkunci'), backgroundColor: AppColors.success),
      );
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        _toast('Gagal menyimpan: $e');
      }
    }
  }

  void _toast(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  @override
  Widget build(BuildContext context) {
    final draft = context.watch<SesiDraftProvider>();
    final match = draft.isMatch;

    return Scaffold(
      appBar: AppBar(title: const Text('Balancing & Tanda Tangan')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Indikator MATCH / MISMATCH
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: (match ? AppColors.success : AppColors.danger).withOpacity(0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              children: [
                Text(match ? '✓ MATCH' : '✗ MISMATCH',
                    style: TextStyle(color: match ? AppColors.success : AppColors.danger, fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text('Fisik ${formatRupiah(draft.totalFisik)} · Kategori ${formatRupiah(draft.totalKategori)}',
                    style: TextStyle(color: AppColors.muted, fontSize: 13)),
                Text('Selisih ${formatRupiah(draft.selisih)}',
                    style: TextStyle(color: match ? AppColors.success : AppColors.danger, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (!match)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(12)),
              child: const Text('Total fisik dan kategori belum sama. Kembali perbaiki denominasi atau kategori sebelum menandatangani.',
                  style: TextStyle(color: Color(0xFF92400E), fontSize: 13)),
            )
          else ...[
            _sigBlock('Tanda tangan Gembala', _gembalaName, _gembalaSig),
            const SizedBox(height: 18),
            _sigBlock('Tanda tangan Saksi', _saksiName, _saksiSig),
            const SizedBox(height: 22),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                onPressed: _saving ? null : () => _simpanKunci(draft),
                icon: const Icon(Icons.lock),
                label: Text(_saving ? 'Menyimpan…' : 'Simpan & kunci'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _sigBlock(String label, TextEditingController nameCtrl, SignatureController sigCtrl) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nama', isDense: true)),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFD1D5DB)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Signature(controller: sigCtrl, height: 150, backgroundColor: const Color(0xFFF9FAFB)),
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            onPressed: () => sigCtrl.clear(),
            icon: const Icon(Icons.refresh, size: 16),
            label: const Text('Ulangi'),
          ),
        ),
      ],
    );
  }
}
