import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/finance_provider.dart';
import '../../providers/sesi_draft_provider.dart';
import 'kalkulator_denominasi_screen.dart';

const _jenisOptions = [
  'Ibadah Raya 1', 'Ibadah Raya 2', 'Ibadah Raya 3',
  'Ibadah Pemuda', 'Sekolah Minggu', 'Ibadah Doa',
];

class BukaSesiScreen extends StatefulWidget {
  const BukaSesiScreen({super.key});
  @override
  State<BukaSesiScreen> createState() => _BukaSesiScreenState();
}

class _BukaSesiScreenState extends State<BukaSesiScreen> {
  String _jenis = _jenisOptions.first;
  DateTime _tanggal = DateTime.now();
  TimeOfDay? _jam;
  String? _kasId;
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final fin = context.watch<FinanceProvider>();
    _kasId ??= fin.kas.isNotEmpty ? fin.kas.first.id : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Buka Sesi Ibadah')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Jenis ibadah', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _jenis,
            items: _jenisOptions.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
            onChanged: (v) => setState(() => _jenis = v!),
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
          const SizedBox(height: 16),
          const Text('Kas tujuan', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _kasId,
            items: fin.kas.map((k) => DropdownMenuItem(value: k.id, child: Text(k.nama))).toList(),
            onChanged: (v) => setState(() => _kasId = v),
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
    setState(() => _loading = true);
    final draft = context.read<SesiDraftProvider>();
    final tanggalStr = _tanggal.toIso8601String().substring(0, 10);
    final jamStr = _jam == null ? null : '${_jam!.hour.toString().padLeft(2, '0')}:${_jam!.minute.toString().padLeft(2, '0')}';
    try {
      final id = await draft.repo.createSesi(
        jenisIbadah: _jenis, tanggal: tanggalStr, jam: jamStr, kasId: _kasId,
      );
      draft.startNew(sesiId: id, jenisIbadah: _jenis, tanggal: tanggalStr, jam: jamStr, kasId: _kasId);
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const KalkulatorDenominasiScreen()));
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
