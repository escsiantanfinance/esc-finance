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

/// Jenis persembahan ⇄ label
const Map<String, String> kOfferingLabels = {
  'perpuluhan': 'Perpuluhan',
  'persembahan_umum': 'Persembahan Umum',
  'janji_iman': 'Janji Iman',
  'persembahan_khusus': 'Persembahan Khusus',
  'kolekte': 'Kolekte',
  'lainnya': 'Lainnya',
};

// ============================================================
// MODELS
// ============================================================
class Profile {
  final String id;
  final String fullName;
  final String role;
  final bool isSuperAdmin;
  Profile({required this.id, required this.fullName, required this.role, this.isSuperAdmin = false});
  factory Profile.fromMap(Map<String, dynamic> m) => Profile(
        id: m['id'],
        fullName: m['full_name'] ?? '',
        role: m['role'] ?? 'majelis',
        isSuperAdmin: m['is_super_admin'] ?? false,
      );
}

class Kas {
  final String id;
  final String nama;
  final String tipe;
  final double saldoSaatIni;
  Kas({required this.id, required this.nama, required this.tipe, required this.saldoSaatIni});
  factory Kas.fromMap(Map<String, dynamic> m) => Kas(
        id: m['id'],
        nama: m['nama'] ?? '',
        tipe: m['tipe'] ?? 'tunai',
        saldoSaatIni: _toD(m['saldo_saat_ini']),
      );
}

class KategoriPengeluaran {
  final String id;
  final String nama;
  KategoriPengeluaran({required this.id, required this.nama});
  factory KategoriPengeluaran.fromMap(Map<String, dynamic> m) =>
      KategoriPengeluaran(id: m['id'], nama: m['nama'] ?? '');
}

class SesiIbadah {
  final String id;
  final String jenisIbadah;
  final String tanggal;
  final String? jam;
  final String? kasId;
  final String status; // draft | balanced | signed_locked
  final double totalFisik;
  final double totalKategori;
  final double selisih;
  final String? namaGembala;
  final String? namaSaksi;
  SesiIbadah({
    required this.id,
    required this.jenisIbadah,
    required this.tanggal,
    this.jam,
    this.kasId,
    required this.status,
    required this.totalFisik,
    required this.totalKategori,
    required this.selisih,
    this.namaGembala,
    this.namaSaksi,
  });
  bool get isMatch => selisih == 0;
  bool get isLocked => status == 'signed_locked';
  factory SesiIbadah.fromMap(Map<String, dynamic> m) => SesiIbadah(
        id: m['id'],
        jenisIbadah: m['jenis_ibadah'] ?? '',
        tanggal: m['tanggal']?.toString() ?? '',
        jam: m['jam']?.toString(),
        kasId: m['kas_id']?.toString(),
        status: m['status'] ?? 'draft',
        totalFisik: _toD(m['total_fisik']),
        totalKategori: _toD(m['total_kategori']),
        selisih: _toD(m['selisih']),
        namaGembala: m['nama_gembala'],
        namaSaksi: m['nama_saksi'],
      );
}

class Pengeluaran {
  final String id;
  final String tanggal;
  final double jumlah;
  final String keterangan;
  final String status;
  final String? kategoriNama;
  Pengeluaran({
    required this.id,
    required this.tanggal,
    required this.jumlah,
    required this.keterangan,
    required this.status,
    this.kategoriNama,
  });
  factory Pengeluaran.fromMap(Map<String, dynamic> m) => Pengeluaran(
        id: m['id'],
        tanggal: m['tanggal']?.toString() ?? '',
        jumlah: _toD(m['jumlah']),
        keterangan: m['keterangan'] ?? '',
        status: m['status'] ?? 'pending',
        kategoriNama: (m['kategori'] is Map) ? m['kategori']['nama'] : null,
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

/// Baris kategori persembahan saat input (lokal, sebelum upload)
class KategoriInput {
  final String jenis; // key offering type
  double jumlah;
  KategoriInput({required this.jenis, this.jumlah = 0});
  Map<String, dynamic> toMap() => {'jenis': jenis, 'jumlah': jumlah};
  factory KategoriInput.fromMap(Map<String, dynamic> m) =>
      KategoriInput(jenis: m['jenis'], jumlah: _toD(m['jumlah']));
}
