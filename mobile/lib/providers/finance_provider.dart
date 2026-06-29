import 'package:flutter/foundation.dart';
import '../data/finance_repository.dart';
import '../models/models.dart';

class FinanceProvider extends ChangeNotifier {
  final repo = FinanceRepository();

  DashboardSummary? summary;
  List<Kas> kas = [];
  List<KategoriPengeluaran> kategori = [];
  List<KategoriPersembahan> kategoriPersembahan = [];
  Set<String> kasAksesIds = {};
  List<SesiIbadah> sesiList = [];
  List<Pengeluaran> pengeluaran = [];
  List<Anggaran> anggaran = [];
  bool busy = false;

  Future<void> loadDashboard() async {
    _setBusy(true);
    try {
      summary = await repo.getDashboardSummary();
    } catch (_) {}
    _setBusy(false);
  }

  Future<void> ensureKasKategori() async {
    if (kas.isEmpty) kas = await repo.getKasList();
    if (kategori.isEmpty) kategori = await repo.getKategoriList();
    if (kategoriPersembahan.isEmpty) kategoriPersembahan = await repo.getKategoriPersembahanList();
    if (kasAksesIds.isEmpty) kasAksesIds = await repo.getKasAksesIds();
    notifyListeners();
  }

  /// Kas yang boleh dipakai user ini: semua bila [fullAccess] (admin/super admin),
  /// selain itu hanya yang diizinkan lewat kas_akses.
  List<Kas> kasUntuk(bool fullAccess) =>
      fullAccess ? kas : kas.where((k) => kasAksesIds.contains(k.id)).toList();

  /// Kategori persembahan yang boleh dipakai user ini, mengikuti akses kas tujuannya.
  List<KategoriPersembahan> kategoriPersembahanUntuk(bool fullAccess) => fullAccess
      ? kategoriPersembahan
      : kategoriPersembahan.where((k) => k.kasId != null && kasAksesIds.contains(k.kasId)).toList();

  Future<void> loadSesi() async {
    _setBusy(true);
    try {
      sesiList = await repo.getSesiList();
    } catch (_) {}
    _setBusy(false);
  }

  Future<void> deleteSesi(String sesiId) async {
    await repo.deleteSesi(sesiId);
    await loadSesi();
  }

  Future<void> loadPengeluaran() async {
    _setBusy(true);
    try {
      pengeluaran = await repo.getPengeluaranList();
    } catch (_) {}
    _setBusy(false);
  }

  Future<void> loadAnggaran(int tahun) async {
    _setBusy(true);
    try {
      anggaran = await repo.getAnggaranList(tahun);
    } catch (_) {}
    _setBusy(false);
  }

  void _setBusy(bool v) {
    busy = v;
    notifyListeners();
  }
}
