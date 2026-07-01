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

  Future<void> loadDashboard(bool fullAccess) async {
    _setBusy(true);
    try {
      final summaryGlobal = await repo.getDashboardSummary();
      kasAksesIds = await repo.getKasAksesIds();
      kas = await repo.getKasList();
      
      if (fullAccess) {
        summary = summaryGlobal;
      } else {
        // Bendahara: hitung pemasukan/pengeluaran bulan ini sesuai kas yang bisa diakses (di-filter RLS Supabase)
        final now = DateTime.now();
        final startOfMonth = "${now.year}-${now.month.toString().padLeft(2, '0')}-01";
        
        double pMasuk = 0;
        try {
          final res = await repo.client.from('persembahan').select('jumlah').gte('tanggal', startOfMonth);
          for (var r in (res as List)) pMasuk += (r['jumlah'] as num).toDouble();
        } catch (_) {}

        double pKeluar = 0;
        try {
          final res = await repo.client.from('pengeluaran').select('jumlah').gte('tanggal', startOfMonth).eq('status', 'disetujui');
          for (var r in (res as List)) pKeluar += (r['jumlah'] as num).toDouble();
        } catch (_) {}

        double saldo = 0;
        for (var k in kas.where((k) => kasAksesIds.contains(k.id))) {
          saldo += k.saldoSaatIni;
        }

        summary = DashboardSummary(
          pemasukanBulanIni: pMasuk,
          pengeluaranBulanIni: pKeluar,
          pemasukanTahunIni: summaryGlobal.pemasukanTahunIni,
          pengeluaranTahunIni: summaryGlobal.pengeluaranTahunIni,
          pengeluaranPending: summaryGlobal.pengeluaranPending,
          totalSaldo: saldo,
        );
      }
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
