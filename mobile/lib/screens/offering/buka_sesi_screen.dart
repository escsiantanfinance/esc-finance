import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/finance_provider.dart';
import '../../providers/sesi_draft_provider.dart';
import 'input_kategori_screen.dart';

class BukaSesiScreen extends StatefulWidget {
  const BukaSesiScreen({super.key});
  @override
  State<BukaSesiScreen> createState() => _BukaSesiScreenState();
}

class _BukaSesiScreenState extends State<BukaSesiScreen> {
  final _namaSesiCtrl = TextEditingController();
  DateTime _tanggal = DateTime.now();
  TimeOfDay? _jam;
  bool _loading = false;

  @override
  void dispose() {
    _namaSesiCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Buka Sesi Ibadah')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Nama sesi', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextFormField(
            controller: _namaSesiCtrl,
            decoration: const InputDecoration(hintText: 'mis. Persembahan Pagi'),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _picker(
                  label: 'Tanggal',
                  value: _tanggal.toIso8601String().substring(0, 10),
                  onTap: () async {
                    final d = await showDatePicker(
                      context: context,
                      initialDate: _tanggal,
                      firstDate: DateTime(2020),
                      lastDate: DateTime(2100),
                    );
                    if (d != null) setState(() => _tanggal = d);
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _picker(
                  label: 'Jam',
                  value: _jam == null ? 'Pilih' : _jam!.format(context),
                  onTap: () async {
                    final t = await showTimePicker(context: context, initialTime: TimeOfDay.now());
                    if (t != null) setState(() => _jam = t);
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),
          ElevatedButton.icon(
            onPressed: _loading ? null : _mulai,
            icon: const Icon(Icons.calculate),
            label: Text(_loading ? 'Membuka…' : 'Mulai hitung'),
          ),
        ],
      ),
    );
  }

  Future<void> _mulai() async {
    if (_namaSesiCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Nama sesi wajib diisi')));
      return;
    }
    setState(() => _loading = true);
    final draft = context.read<SesiDraftProvider>();
    final namaSesi = _namaSesiCtrl.text.trim();
    final tanggalStr = _tanggal.toIso8601String().substring(0, 10);
    final jamStr = _jam == null ? null : '${_jam!.hour.toString().padLeft(2, '0')}:${_jam!.minute.toString().padLeft(2, '0')}';
    try {
      final id = await draft.repo.createSesi(
        namaSesi: namaSesi, jenisIbadah: namaSesi, tanggal: tanggalStr, jam: jamStr,
      );
      draft.startNew(sesiId: id, namaSesi: namaSesi, jenisIbadah: namaSesi, tanggal: tanggalStr, jam: jamStr);
      if (!mounted) return;
      await context.read<FinanceProvider>().ensureKasKategori();
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const InputKategoriScreen()));
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal membuka sesi: $e')));
      }
    }
  }

  Widget _picker({required String label, required String value, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      child: InputDecorator(
        decoration: InputDecoration(labelText: label),
        child: Text(value),
      ),
    );
  }
}
