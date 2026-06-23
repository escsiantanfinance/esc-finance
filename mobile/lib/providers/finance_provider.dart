import 'package:flutter/foundation.dart';
import '../data/finance_repository.dart';
import '../models/models.dart';

class FinanceProvider extends ChangeNotifier {
  final repo = FinanceRepository();

  DashboardSummary? summary;
  List<Kas> kas = [];
  List<KategoriPengeluaran> kategori = [];
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
    notifyListeners();
  }

  Future<void> loadSesi() async {
    _setBusy(true);
    try {
      sesiList = await repo.getSesiList();
    } catch (_) {}
    _setBusy(false);
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
