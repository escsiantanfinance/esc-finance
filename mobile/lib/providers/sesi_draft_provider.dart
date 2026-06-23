import 'package:flutter/foundation.dart';
import '../data/finance_repository.dart';
import '../data/local_draft_store.dart';
import '../models/models.dart';

/// State alur rekonsiliasi sesi yang sedang berjalan.
/// Auto-save ke SQLite setiap perubahan (PRD §4 anti-hilang data).
class SesiDraftProvider extends ChangeNotifier {
  final repo = FinanceRepository();

  String? sesiId;
  String jenisIbadah = '';
  String tanggal = DateTime.now().toIso8601String().substring(0, 10);
  String? jam;
  String? kasId;

  Map<int, int> pecahan = {for (final d in kDenominations) d: 0};
  List<KategoriInput> kategori = [
    KategoriInput(jenis: 'perpuluhan'),
    KategoriInput(jenis: 'persembahan_umum'),
    KategoriInput(jenis: 'janji_iman'),
    KategoriInput(jenis: 'persembahan_khusus'),
  ];

  double get totalFisik =>
      pecahan.entries.fold(0, (s, e) => s + e.key * e.value);
  double get totalKategori =>
      kategori.fold(0, (s, k) => s + k.jumlah);
  double get selisih => totalFisik - totalKategori;
  bool get isMatch => totalFisik > 0 && selisih == 0;

  // ---------- lifecycle ----------
  void startNew({
    required String sesiId,
    required String jenisIbadah,
    required String tanggal,
    String? jam,
    String? kasId,
  }) {
    this.sesiId = sesiId;
    this.jenisIbadah = jenisIbadah;
    this.tanggal = tanggal;
    this.jam = jam;
    this.kasId = kasId;
    pecahan = {for (final d in kDenominations) d: 0};
    kategori = [
      KategoriInput(jenis: 'perpuluhan'),
      KategoriInput(jenis: 'persembahan_umum'),
      KategoriInput(jenis: 'janji_iman'),
      KategoriInput(jenis: 'persembahan_khusus'),
    ];
    _autosave();
    notifyListeners();
  }

  void setLembar(int nominal, int lembar) {
    pecahan[nominal] = lembar < 0 ? 0 : lembar;
    _autosave();
    notifyListeners();
  }

  void setKategori(String jenis, double jumlah) {
    final k = kategori.firstWhere((e) => e.jenis == jenis);
    k.jumlah = jumlah < 0 ? 0 : jumlah;
    _autosave();
    notifyListeners();
  }

  // ---------- sinkronisasi ke Supabase ----------
  Future<void> syncDenominasi() async {
    if (sesiId == null) return;
    await repo.savePecahan(sesiId!, pecahan);
  }

  Future<void> syncKategori() async {
    if (sesiId == null) return;
    await repo.savePersembahanKategori(sesiId!, kasId, tanggal, kategori);
  }

  Future<void> finalizeLock({
    required String namaGembala,
    required String ttdGembalaUrl,
    required String namaSaksi,
    required String ttdSaksiUrl,
  }) async {
    if (sesiId == null) return;
    await repo.lockSesi(
      sesiId!,
      namaGembala: namaGembala,
      ttdGembalaUrl: ttdGembalaUrl,
      namaSaksi: namaSaksi,
      ttdSaksiUrl: ttdSaksiUrl,
    );
    await LocalDraftStore.clear();
    reset();
  }

  void reset() {
    sesiId = null;
    jenisIbadah = '';
    jam = null;
    kasId = null;
    pecahan = {for (final d in kDenominations) d: 0};
    kategori = [
      KategoriInput(jenis: 'perpuluhan'),
      KategoriInput(jenis: 'persembahan_umum'),
      KategoriInput(jenis: 'janji_iman'),
      KategoriInput(jenis: 'persembahan_khusus'),
    ];
    notifyListeners();
  }

  // ---------- draft lokal ----------
  void _autosave() {
    LocalDraftStore.save(toMap());
  }

  Map<String, dynamic> toMap() => {
        'sesiId': sesiId,
        'jenisIbadah': jenisIbadah,
        'tanggal': tanggal,
        'jam': jam,
        'kasId': kasId,
        'pecahan': pecahan.map((k, v) => MapEntry(k.toString(), v)),
        'kategori': kategori.map((k) => k.toMap()).toList(),
      };

  void loadFromMap(Map<String, dynamic> m) {
    sesiId = m['sesiId'];
    jenisIbadah = m['jenisIbadah'] ?? '';
    tanggal = m['tanggal'] ?? tanggal;
    jam = m['jam'];
    kasId = m['kasId'];
    final pm = (m['pecahan'] as Map?) ?? {};
    pecahan = {for (final d in kDenominations) d: (pm[d.toString()] ?? 0) as int};
    final km = (m['kategori'] as List?) ?? [];
    if (km.isNotEmpty) {
      kategori = km.map((e) => KategoriInput.fromMap(Map<String, dynamic>.from(e))).toList();
    }
    notifyListeners();
  }

  /// Cek draft tersimpan saat app dibuka.
  Future<bool> hasSavedDraft() async {
    final d = await LocalDraftStore.load();
    return d != null && d['sesiId'] != null;
  }

  Future<void> resumeDraft() async {
    final d = await LocalDraftStore.load();
    if (d != null) loadFromMap(d);
  }
}
