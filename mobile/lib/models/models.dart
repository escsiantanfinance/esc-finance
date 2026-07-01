import 'package:intl/intl.dart';

// ============================================================
// HELPERS
// ============================================================
final _rupiah = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
String formatRupiah(num? v) => _rupiah.format(v ?? 0);

double _toD(dynamic v) => v == null ? 0 : (v is num ? v.toDouble() : double.tryParse(v.toString()) ?? 0);
int _toI(dynamic v) => v == null ? 0 : (v is num ? v.toInt() : int.tryParse(v.toString()) ?? 0);

/// Pecahan uang (denominasi) untuk kalkulator
const List<int> kDenominations = [100000, 50000, 20000, 10000, 5000, 2000, 1000];

// ============================================================
// MODELS
// ============================================================
class Profile {
  final String id;
  final String fullName;
  final String role;
  final bool isSuperAdmin;
  final bool bolehApprovePengeluaran;
  final List<String> allowedPages;
  Profile({
    required this.id,
    required this.fullName,
    required this.role,
    this.isSuperAdmin = false,
    this.bolehApprovePengeluaran = false,
    this.allowedPages = const [],
  });
  bool get isFullAccess => role == 'admin' || isSuperAdmin;
  factory Profile.fromMap(Map<String, dynamic> m) => Profile(
        id: m['id'],
        fullName: m['full_name'] ?? '',
        role: m['role'] ?? 'majelis',
        isSuperAdmin: m['is_super_admin'] ?? false,
        bolehApprovePengeluaran: m['boleh_approve_pengeluaran'] ?? false,
        allowedPages: List<String>.from(m['allowed_pages'] ?? []),
      );
}

class Kas {
  final String id;
  final String nama;
  final String tipe;
  final double saldoSaatIni;
  final String? penanggungJawab;
  Kas({required this.id, required this.nama, required this.tipe, required this.saldoSaatIni, this.penanggungJawab});
  factory Kas.fromMap(Map<String, dynamic> m) => Kas(
        id: m['id'],
        nama: m['nama'] ?? '',
        tipe: m['tipe'] ?? 'tunai',
        saldoSaatIni: _toD(m['saldo_saat_ini']),
        penanggungJawab: m['penanggung_jawab'],
      );
}

class KategoriPengeluaran {
  final String id;
  final String nama;
  KategoriPengeluaran({required this.id, required this.nama});
  factory KategoriPengeluaran.fromMap(Map<String, dynamic> m) =>
      KategoriPengeluaran(id: m['id'], nama: m['nama'] ?? '');
}

/// Kategori persembahan — dicustom Super Admin, tiap kategori menuju satu kas.
class KategoriPersembahan {
  final String id;
  final String nama;
  final String? kasId;
  final String? kasNama;
  final bool butuhNama;
  final bool isPerpuluhan;
  final int urutan;
  KategoriPersembahan({
    required this.id,
    required this.nama,
    this.kasId,
    this.kasNama,
    this.butuhNama = false,
    this.isPerpuluhan = false,
    this.urutan = 0,
  });
  factory KategoriPersembahan.fromMap(Map<String, dynamic> m) => KategoriPersembahan(
        id: m['id'],
        nama: m['nama'] ?? '-',
        kasId: m['kas_id']?.toString(),
        kasNama: (m['kas'] is Map) ? m['kas']['nama'] : null,
        butuhNama: m['butuh_nama'] ?? false,
        isPerpuluhan: m['is_perpuluhan'] ?? false,
        urutan: _toI(m['urutan']),
      );
}

class SesiIbadah {
  final String id;
  final String? namaSesi;
  final String jenisIbadah;
  final String tanggal;
  final String? jam;
  final String? kasId;
  final String status; // draft | balanced | signed_locked
  final double totalFisik;
  final double totalKategori;
  final double totalPengeluaran;
  final double selisih;
  final String? namaGembala;
  final String? namaBendahara;
  final String? namaPenghitung1;
  final String? namaPenghitung2;
  SesiIbadah({
    required this.id,
    this.namaSesi,
    required this.jenisIbadah,
    required this.tanggal,
    this.jam,
    this.kasId,
    required this.status,
    required this.totalFisik,
    required this.totalKategori,
    this.totalPengeluaran = 0,
    required this.selisih,
    this.namaGembala,
    this.namaBendahara,
    this.namaPenghitung1,
    this.namaPenghitung2,
  });
  bool get isMatch => totalFisik > 0 && selisih == 0;
  bool get isLocked => status == 'signed_locked';
  String get judul => (namaSesi != null && namaSesi!.isNotEmpty) ? namaSesi! : jenisIbadah;
  factory SesiIbadah.fromMap(Map<String, dynamic> m) => SesiIbadah(
        id: m['id'],
        namaSesi: m['nama_sesi'],
        jenisIbadah: m['jenis_ibadah'] ?? '',
        tanggal: m['tanggal']?.toString() ?? '',
        jam: m['jam']?.toString(),
        kasId: m['kas_id']?.toString(),
        status: m['status'] ?? 'draft',
        totalFisik: _toD(m['total_fisik']),
        totalKategori: _toD(m['total_kategori']),
        totalPengeluaran: _toD(m['total_pengeluaran']),
        selisih: _toD(m['selisih']),
        namaGembala: m['nama_gembala'],
        namaBendahara: m['nama_bendahara'],
        namaPenghitung1: m['nama_penghitung1'],
        namaPenghitung2: m['nama_penghitung2'],
      );
}

class Pengeluaran {
  final String id;
  final String tanggal;
  final double jumlah;
  final String keterangan;
  final String status;
  final String? kategoriId;
  final String? kategoriNama;
  final String? kasId;
  final String? kasNama;
  final String? penerima;
  Pengeluaran({
    required this.id,
    required this.tanggal,
    required this.jumlah,
    required this.keterangan,
    required this.status,
    this.kategoriId,
    this.kategoriNama,
    this.kasId,
    this.kasNama,
    this.penerima,
  });
  factory Pengeluaran.fromMap(Map<String, dynamic> m) => Pengeluaran(
        id: m['id'],
        tanggal: m['tanggal']?.toString() ?? '',
        jumlah: _toD(m['jumlah']),
        keterangan: m['keterangan'] ?? '',
        status: m['status'] ?? 'pending',
        kategoriId: m['kategori_id']?.toString(),
        kategoriNama: (m['kategori'] is Map) ? m['kategori']['nama'] : null,
        kasId: m['kas_id']?.toString(),
        kasNama: (m['kas'] is Map) ? m['kas']['nama'] : null,
        penerima: m['penerima'],
      );
}

class Anggaran {
  final String id;
  final int tahun;
  final int? bulan;
  final String namaPos;
  final double jumlahDianggarkan;
  final String? kategoriNama;
  Anggaran({
    required this.id,
    required this.tahun,
    this.bulan,
    required this.namaPos,
    required this.jumlahDianggarkan,
    this.kategoriNama,
  });
  factory Anggaran.fromMap(Map<String, dynamic> m) => Anggaran(
        id: m['id'],
        tahun: _toI(m['tahun']),
        bulan: m['bulan'] == null ? null : _toI(m['bulan']),
        namaPos: m['nama_pos'] ?? '',
        jumlahDianggarkan: _toD(m['jumlah_dianggarkan']),
        kategoriNama: (m['kategori'] is Map) ? m['kategori']['nama'] : null,
      );
}

class DashboardSummary {
  final double pemasukanBulanIni;
  final double pengeluaranBulanIni;
  final double totalSaldo;
  final int pengeluaranPending;
  DashboardSummary({
    required this.pemasukanBulanIni,
    required this.pengeluaranBulanIni,
    required this.totalSaldo,
    required this.pengeluaranPending,
  });
  factory DashboardSummary.fromMap(Map<String, dynamic> m) => DashboardSummary(
        pemasukanBulanIni: _toD(m['pemasukan_bulan_ini']),
        pengeluaranBulanIni: _toD(m['pengeluaran_bulan_ini']),
        totalSaldo: _toD(m['total_saldo']),
        pengeluaranPending: _toI(m['pengeluaran_pending']),
      );
}

/// Satu baris nama pemberi + jumlah (untuk kategori yang butuhNama, mis. Persepuluhan).
class NamaJumlah {
  String nama;
  double jumlah;
  NamaJumlah({this.nama = '', this.jumlah = 0});
  Map<String, dynamic> toMap() => {'nama': nama, 'jumlah': jumlah};
  factory NamaJumlah.fromMap(Map<String, dynamic> m) =>
      NamaJumlah(nama: m['nama'] ?? '', jumlah: _toD(m['jumlah']));
}

/// Kategori yang dipilih bendahara untuk sesi ini (lokal, sebelum upload).
/// butuhNama=true → diisi lewat daftar [items]; selain itu lewat [total] langsung.
class KategoriEntry {
  final String kategoriId;
  final String nama;
  final bool butuhNama;
  double total;
  List<NamaJumlah> items;
  KategoriEntry({
    required this.kategoriId,
    required this.nama,
    required this.butuhNama,
    this.total = 0,
    List<NamaJumlah>? items,
  }) : items = items ?? [];
  double get jumlah => butuhNama ? items.fold(0.0, (s, e) => s + e.jumlah) : total;
  Map<String, dynamic> toMap() => {
        'kategoriId': kategoriId,
        'nama': nama,
        'butuhNama': butuhNama,
        'total': total,
        'items': items.map((e) => e.toMap()).toList(),
      };
  factory KategoriEntry.fromMap(Map<String, dynamic> m) => KategoriEntry(
        kategoriId: m['kategoriId'],
        nama: m['nama'] ?? '',
        butuhNama: m['butuhNama'] ?? false,
        total: _toD(m['total']),
        items: ((m['items'] as List?) ?? [])
            .map((e) => NamaJumlah.fromMap(Map<String, dynamic>.from(e)))
            .toList(),
      );
}

/// Pengeluaran tunai "Kartu Biru" yang dicatat saat hitung sesi (lokal sebelum upload).
/// [id] terisi setelah baris berhasil disimpan ke server.
class PengeluaranInput {
  String? id;
  String keterangan;
  double jumlah;
  String? penerima;
  String? kategoriId;
  String? kasId;
  PengeluaranInput({
    this.id,
    this.keterangan = '',
    this.jumlah = 0,
    this.penerima,
    this.kategoriId,
    this.kasId,
  });
  Map<String, dynamic> toMap() => {
        'id': id,
        'keterangan': keterangan,
        'jumlah': jumlah,
        'penerima': penerima,
        'kategoriId': kategoriId,
        'kasId': kasId,
      };
  factory PengeluaranInput.fromMap(Map<String, dynamic> m) => PengeluaranInput(
        id: m['id'],
        keterangan: m['keterangan'] ?? '',
        jumlah: _toD(m['jumlah']),
        penerima: m['penerima'],
        kategoriId: m['kategoriId'],
        kasId: m['kasId'],
      );
}
