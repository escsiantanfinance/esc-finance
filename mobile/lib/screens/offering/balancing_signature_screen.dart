import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:signature/signature.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/sesi_draft_provider.dart';
import '../../utils/currency_formatter.dart';
import '../widgets/stepper_header.dart';

class BalancingSignatureScreen extends StatefulWidget {
  const BalancingSignatureScreen({super.key});
  @override
  State<BalancingSignatureScreen> createState() => _BalancingSignatureScreenState();
}

class _BalancingSignatureScreenState extends State<BalancingSignatureScreen> {
  final _p1Name = TextEditingController();
  final _p2Name = TextEditingController();
  final _bendaharaName = TextEditingController();
  final _gembalaName = TextEditingController();
  final _p1Sig = SignatureController(penStrokeWidth: 2, penColor: Colors.black87);
  final _p2Sig = SignatureController(penStrokeWidth: 2, penColor: Colors.black87);
  final _bendaharaSig = SignatureController(penStrokeWidth: 2, penColor: Colors.black87);
  final _gembalaSig = SignatureController(penStrokeWidth: 2, penColor: Colors.black87);
  bool _saving = false;

  @override
  void dispose() {
    _p1Name.dispose();
    _p2Name.dispose();
    _bendaharaName.dispose();
    _gembalaName.dispose();
    _p1Sig.dispose();
    _p2Sig.dispose();
    _bendaharaSig.dispose();
    _gembalaSig.dispose();
    super.dispose();
  }

  Future<void> _simpanKunci(SesiDraftProvider draft) async {
    if (!draft.isMatch) return;
    if (_p1Name.text.isEmpty || _p2Name.text.isEmpty || _bendaharaName.text.isEmpty || _gembalaName.text.isEmpty) {
      _toast('Semua nama penandatangan wajib diisi');
      return;
    }
    if (_p1Sig.isEmpty || _p2Sig.isEmpty || _bendaharaSig.isEmpty || _gembalaSig.isEmpty) {
      _toast('Semua tanda tangan wajib diisi');
      return;
    }
    setState(() => _saving = true);
    try {
      final p1Bytes = await _p1Sig.toPngBytes();
      final p2Bytes = await _p2Sig.toPngBytes();
      final bBytes = await _bendaharaSig.toPngBytes();
      final gBytes = await _gembalaSig.toPngBytes();
      final p1Url = await draft.repo.uploadSignature(p1Bytes!, 'penghitung1');
      final p2Url = await draft.repo.uploadSignature(p2Bytes!, 'penghitung2');
      final bUrl = await draft.repo.uploadSignature(bBytes!, 'bendahara');
      final gUrl = await draft.repo.uploadSignature(gBytes!, 'gembala');
      await draft.finalizeLock(
        namaPenghitung1: _p1Name.text,
        ttdPenghitung1Url: p1Url,
        namaPenghitung2: _p2Name.text,
        ttdPenghitung2Url: p2Url,
        namaBendahara: _bendaharaName.text,
        ttdBendaharaUrl: bUrl,
        namaGembala: _gembalaName.text,
        ttdGembalaUrl: gUrl,
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
      body: Column(
        children: [
          const StepperHeader(step: 4),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Indikator MATCH / MISMATCH
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: (match ? AppColors.success : AppColors.danger).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    children: [
                      Text(match ? '✓ MATCH' : '✗ MISMATCH',
                          style: TextStyle(color: match ? AppColors.success : AppColors.danger, fontSize: 22, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Text(
                        'Fisik ${formatRupiah(draft.totalFisik)} · Kategori ${formatRupiah(draft.totalKategori)} · Keluar ${formatRupiah(draft.totalPengeluaran)}',
                        style: TextStyle(color: AppColors.muted, fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
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
                    child: const Text(
                      'Total fisik dan (kategori − pengeluaran) belum sama. Kembali perbaiki denominasi, kategori, atau pengeluaran sebelum menandatangani.',
                      style: TextStyle(color: Color(0xFF92400E), fontSize: 13),
                    ),
                  )
                else ...[
                  _sigBlock('Tanda tangan Penghitung 1', _p1Name, _p1Sig),
                  const SizedBox(height: 18),
                  _sigBlock('Tanda tangan Penghitung 2', _p2Name, _p2Sig),
                  const SizedBox(height: 18),
                  _sigBlock('Tanda tangan Bendahara', _bendaharaName, _bendaharaSig),
                  const SizedBox(height: 18),
                  _sigBlock('Tanda tangan Gembala', _gembalaName, _gembalaSig),
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
          ),
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
