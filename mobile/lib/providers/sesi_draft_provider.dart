import 'package:flutter/foundation.dart';
import '../data/finance_repository.dart';
import '../data/local_draft_store.dart';
import '../models/models.dart';

/// State alur rekonsiliasi sesi yang sedang berjalan.
/// Auto-save ke SQLite setiap perubahan (PRD §4 anti-hilang data).
class SesiDraftProvider extends ChangeNotifier {
  final repo = FinanceRepository();

  String? sesiId;
  String namaSesi = '';
  String jenisIbadah = '';
  String tanggal = DateTime.now().toIso8601String().substring(0, 10);
  String? jam;
  String? kasId;

  Map<int, int> pecahan = {for (final d in kDenominations) d: 0};
  List<KategoriEntry> kategori = [];
  List<PengeluaranInput> pengeluaran = [];

  double get totalFisik =>
      pecahan.entries.fold(0, (s, e) => s + e.key * e.value);
  double get totalKategori =>
      kategori.fold(0, (s, k) => s + k.jumlah);
  double get totalPengeluaran =>
      pengeluaran.fold(0, (s, p) => s + p.jumlah);
  /// fisik = kategori − pengeluaran (uang fisik berkurang sebesar pengeluaran tunai)
  double get selisih => totalFisik - totalKategori + totalPengeluaran;
  bool get isMatch => totalFisik > 0 && selisih == 0;

  // ---------- lifecycle ----------
  void startNew({
    required String sesiId,
    required String namaSesi,
    required String jenisIbadah,
    required String tanggal,
    String? jam,
    String? kasId,
  }) {
    this.sesiId = sesiId;
    this.namaSesi = namaSesi;
    this.jenisIbadah = jenisIbadah;
    this.tanggal = tanggal;
    this.jam = jam;
    this.kasId = kasId;
    pecahan = {for (final d in kDenominations) d: 0};
    kategori = [];
    pengeluaran = [];
    _autosave();
    notifyListeners();
  }

  /// Lanjutkan sesi draft yang sudah ada: muat denominasi, kategori (+nama
  /// pemberi) & kartu biru dari server. [masterKategori] = daftar kategori
  /// aktif terkini (dari FinanceProvider) untuk tahu flag butuhNama tiap baris.
  Future<void> resumeExisting(SesiIbadah sesi, List<KategoriPersembahan> masterKategori) async {
    sesiId = sesi.id;
    namaSesi = sesi.namaSesi ?? '';
    jenisIbadah = sesi.jenisIbadah;
    tanggal = sesi.tanggal;
    jam = sesi.jam;
    kasId = sesi.kasId;

    final pmap = await repo.getPecahan(sesi.id);
    pecahan = {for (final d in kDenominations) d: (pmap[d] ?? 0)};

    final rows = await repo.getPersembahanRows(sesi.id);
    final byKategori = <String, List<Map<String, dynamic>>>{};
    for (final r in rows) {
      final kid = r['kategori_id'] as String;
      byKategori.putIfAbsent(kid, () => []).add(r);
    }
    kategori = byKategori.entries.map((entry) {
      final master = masterKategori.firstWhere(
        (k) => k.id == entry.key,
        orElse: () => KategoriPersembahan(
          id: entry.key,
          nama: '-',
          butuhNama: entry.value.any((r) => (r['nama_pemberi'] as String?)?.isNotEmpty ?? false),
        ),
      );
      final ke = KategoriEntry(kategoriId: master.id, nama: master.nama, butuhNama: master.butuhNama);
      if (master.butuhNama) {
        ke.items = entry.value
            .map((r) => NamaJumlah(nama: r['nama_pemberi'] ?? '', jumlah: (r['jumlah'] as num).toDouble()))
            .toList();
      } else {
        ke.total = entry.value.fold(0.0, (s, r) => s + (r['jumlah'] as num).toDouble());
      }
      return ke;
    }).toList();

    pengeluaran = (await repo.getSesiPengeluaran(sesi.id))
        .map((p) => PengeluaranInput(
              id: p.id,
              keterangan: p.keterangan,
              jumlah: p.jumlah,
              penerima: p.penerima,
              kategoriId: p.kategoriId,
              kasId: p.kasId,
            ))
        .toList();

    _autosave();
    notifyListeners();
  }

  void setLembar(int nominal, int lembar) {
    pecahan[nominal] = lembar < 0 ? 0 : lembar;
    _autosave();
    notifyListeners();
  }

  // ---------- kategori (dipilih manual oleh bendahara) ----------
  bool isKategoriSelected(String kategoriId) => kategori.any((e) => e.kategoriId == kategoriId);

  void toggleKategori(KategoriPersembahan k, bool selected) {
    if (selected) {
      if (isKategoriSelected(k.id)) return;
      kategori.add(KategoriEntry(kategoriId: k.id, nama: k.nama, butuhNama: k.butuhNama));
    } else {
      kategori.removeWhere((e) => e.kategoriId == k.id);
    }
    _autosave();
    notifyListeners();
  }

  void setKategoriTotal(String kategoriId, double jumlah) {
    final k = kategori.firstWhere((e) => e.kategoriId == kategoriId);
    k.total = jumlah < 0 ? 0 : jumlah;
    _autosave();
    notifyListeners();
  }

  void addNamaItem(String kategoriId) {
    kategori.firstWhere((e) => e.kategoriId == kategoriId).items.add(NamaJumlah());
    _autosave();
    notifyListeners();
  }

  void removeNamaItem(String kategoriId, int index) {
    kategori.firstWhere((e) => e.kategoriId == kategoriId).items.removeAt(index);
    _autosave();
    notifyListeners();
  }

  void setNamaItem(String kategoriId, int index, {String? nama, double? jumlah}) {
    final item = kategori.firstWhere((e) => e.kategoriId == kategoriId).items[index];
    if (nama != null) item.nama = nama;
    if (jumlah != null) item.jumlah = jumlah < 0 ? 0 : jumlah;
    _autosave();
    notifyListeners();
  }

  // ---------- pengeluaran tunai "Kartu Biru" ----------
  void addPengeluaran() {
    pengeluaran.add(PengeluaranInput());
    _autosave();
    notifyListeners();
  }

  void updatePengeluaran(int index, {String? keterangan, double? jumlah, String? penerima, String? kategoriId, String? kasId}) {
    final p = pengeluaran[index];
    if (keterangan != null) p.keterangan = keterangan;
    if (jumlah != null) p.jumlah = jumlah < 0 ? 0 : jumlah;
    if (penerima != null) p.penerima = penerima;
    if (kategoriId != null) p.kategoriId = kategoriId;
    if (kasId != null) p.kasId = kasId;
    _autosave();
    notifyListeners();
  }

  /// Hapus baris kartu biru. Bila sudah tersimpan di server, hapus juga di sana.
  Future<void> removePengeluaran(int index) async {
    final p = pengeluaran[index];
    if (p.id != null) await repo.deleteSesiPengeluaran(p.id!);
    pengeluaran.removeAt(index);
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
    await repo.savePersembahanKategori(sesiId!, tanggal, kategori);
  }

  /// Kirim baris kartu biru yang belum tersimpan (id masih null).
  Future<void> syncPengeluaran() async {
    if (sesiId == null) return;
    for (final p in pengeluaran) {
      if (p.id != null) continue;
      if (p.keterangan.trim().isEmpty || p.jumlah <= 0) continue;
      p.id = await repo.addSesiPengeluaran(
        sesiId: sesiId!,
        jumlah: p.jumlah,
        keterangan: p.keterangan.trim(),
        kategoriId: p.kategoriId,
        kasId: p.kasId,
        penerima: p.penerima,
      );
    }
    _autosave();
  }

  Future<void> finalizeLock({
    required String namaPenghitung1,
    required String ttdPenghitung1Url,
    required String namaPenghitung2,
    required String ttdPenghitung2Url,
    required String namaBendahara,
    required String ttdBendaharaUrl,
    required String namaGembala,
    required String ttdGembalaUrl,
  }) async {
    if (sesiId == null) return;
    await repo.lockSesi(
      sesiId!,
      namaPenghitung1: namaPenghitung1,
      ttdPenghitung1Url: ttdPenghitung1Url,
      namaPenghitung2: namaPenghitung2,
      ttdPenghitung2Url: ttdPenghitung2Url,
      namaBendahara: namaBendahara,
      ttdBendaharaUrl: ttdBendaharaUrl,
      namaGembala: namaGembala,
      ttdGembalaUrl: ttdGembalaUrl,
    );
    await LocalDraftStore.clear();
    reset();
  }

  void reset() {
    sesiId = null;
    namaSesi = '';
    jenisIbadah = '';
    jam = null;
    kasId = null;
    pecahan = {for (final d in kDenominations) d: 0};
    kategori = [];
    pengeluaran = [];
    notifyListeners();
  }

  // ---------- draft lokal ----------
  void _autosave() {
    LocalDraftStore.save(toMap());
  }

  Map<String, dynamic> toMap() => {
        'sesiId': sesiId,
        'namaSesi': namaSesi,
        'jenisIbadah': jenisIbadah,
        'tanggal': tanggal,
        'jam': jam,
        'kasId': kasId,
        'pecahan': pecahan.map((k, v) => MapEntry(k.toString(), v)),
        'kategori': kategori.map((k) => k.toMap()).toList(),
        'pengeluaran': pengeluaran.map((p) => p.toMap()).toList(),
      };

  void loadFromMap(Map<String, dynamic> m) {
    sesiId = m['sesiId'];
    namaSesi = m['namaSesi'] ?? '';
    jenisIbadah = m['jenisIbadah'] ?? '';
    tanggal = m['tanggal'] ?? tanggal;
    jam = m['jam'];
    kasId = m['kasId'];
    final pm = (m['pecahan'] as Map?) ?? {};
    pecahan = {for (final d in kDenominations) d: (pm[d.toString()] ?? 0) as int};
    final km = (m['kategori'] as List?) ?? [];
    kategori = km.map((e) => KategoriEntry.fromMap(Map<String, dynamic>.from(e))).toList();
    final pgm = (m['pengeluaran'] as List?) ?? [];
    pengeluaran = pgm.map((e) => PengeluaranInput.fromMap(Map<String, dynamic>.from(e))).toList();
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
