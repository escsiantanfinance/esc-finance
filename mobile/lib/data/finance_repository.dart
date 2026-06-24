import 'dart:typed_data';
import '../core/config.dart';
import '../core/supabase_client.dart';
import '../models/models.dart';

/// Akses data ke Supabase (mirror logika web).
class FinanceRepository {
  final _db = SupabaseService.client;

  // ---------- AUTH ----------
  Future<void> login(String email, String password) async {
    await SupabaseService.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> logout() => SupabaseService.auth.signOut();

  Future<Profile?> currentProfile() async {
    final user = SupabaseService.currentUser;
    if (user == null) return null;
    final data = await _db.from('profiles').select().eq('id', user.id).maybeSingle();
    return data == null ? null : Profile.fromMap(data);
  }

  // ---------- DASHBOARD ----------
  Future<DashboardSummary> getDashboardSummary() async {
    final data = await _db.from('dashboard_summary').select().single();
    return DashboardSummary.fromMap(data);
  }

  Future<List<Kas>> getKasList() async {
    final rows = await _db.from('kas').select().eq('is_aktif', true).order('created_at');
    return (rows as List).map((e) => Kas.fromMap(e)).toList();
  }

  Future<List<KategoriPengeluaran>> getKategoriList() async {
    final rows = await _db.from('kategori_pengeluaran').select().eq('is_active', true).order('nama');
    return (rows as List).map((e) => KategoriPengeluaran.fromMap(e)).toList();
  }

  // ---------- SESI IBADAH ----------
  Future<List<SesiIbadah>> getSesiList() async {
    final rows = await _db.from('sesi_ibadah').select().order('tanggal', ascending: false).limit(50);
    return (rows as List).map((e) => SesiIbadah.fromMap(e)).toList();
  }

  Future<SesiIbadah> getSesi(String id) async {
    final data = await _db.from('sesi_ibadah').select().eq('id', id).single();
    return SesiIbadah.fromMap(data);
  }

  /// Buka sesi baru → kembalikan id
  Future<String> createSesi({
    required String jenisIbadah,
    required String tanggal,
    String? jam,
    String? kasId,
  }) async {
    final user = SupabaseService.currentUser;
    final data = await _db.from('sesi_ibadah').insert({
      'jenis_ibadah': jenisIbadah,
      'tanggal': tanggal,
      'jam': jam,
      'kas_id': kasId,
      'status': 'draft',
      'dibuka_oleh': user?.id,
    }).select('id').single();
    return data['id'] as String;
  }

  /// Simpan denominasi (upsert per nominal). Trigger menghitung total_fisik.
  Future<void> savePecahan(String sesiId, Map<int, int> lembarPerNominal) async {
    final rows = lembarPerNominal.entries
        .map((e) => {'sesi_id': sesiId, 'nominal': e.key, 'jumlah_lembar': e.value})
        .toList();
    if (rows.isEmpty) return;
    await _db.from('sesi_pecahan').upsert(rows, onConflict: 'sesi_id,nominal');
  }

  /// Simpan kategori persembahan untuk sesi (replace set). Trigger hitung total_kategori.
  Future<void> savePersembahanKategori(
    String sesiId,
    String? kasId,
    String tanggal,
    List<KategoriInput> kategori,
  ) async {
    await _db.from('persembahan').delete().eq('sesi_id', sesiId);
    final rows = kategori
        .where((k) => k.jumlah > 0)
        .map((k) => {
              'sesi_id': sesiId,
              'kas_id': kasId,
              'tanggal': tanggal,
              'jenis': k.jenis,
              'jumlah': k.jumlah,
            })
        .toList();
    if (rows.isNotEmpty) {
      await _db.from('persembahan').insert(rows);
    }
  }

  /// Upload gambar tanda tangan → kembalikan public URL
  Future<String> uploadSignature(Uint8List bytes, String name) async {
    final path = 'ttd-$name-${DateTime.now().millisecondsSinceEpoch}.png';
    await _db.storage.from(AppConfig.signaturesBucket).uploadBinary(
          path,
          bytes,
        );
    return _db.storage.from(AppConfig.signaturesBucket).getPublicUrl(path);
  }

  /// Kunci sesi setelah balanced & ditandatangani
  Future<void> lockSesi(
    String sesiId, {
    required String namaGembala,
    required String ttdGembalaUrl,
    required String namaSaksi,
    required String ttdSaksiUrl,
  }) async {
    await _db.from('sesi_ibadah').update({
      'nama_gembala': namaGembala,
      'ttd_gembala_url': ttdGembalaUrl,
      'nama_saksi': namaSaksi,
      'ttd_saksi_url': ttdSaksiUrl,
      'status': 'signed_locked',
      'signed_at': DateTime.now().toIso8601String(),
    }).eq('id', sesiId);
  }

  // ---------- PENGELUARAN ----------
  Future<List<Pengeluaran>> getPengeluaranList() async {
    final rows = await _db
        .from('pengeluaran')
        .select('*, kategori:kategori_id(nama)')
        .order('tanggal', ascending: false)
        .limit(50);
    return (rows as List).map((e) => Pengeluaran.fromMap(e)).toList();
  }

  Future<void> createPengeluaran({
    required String tanggal,
    required String kategoriId,
    required String kasId,
    required double jumlah,
    required String keterangan,
    String? penerima,
  }) async {
    final user = SupabaseService.currentUser;
    await _db.from('pengeluaran').insert({
      'tanggal': tanggal,
      'kategori_id': kategoriId,
      'kas_id': kasId,
      'jumlah': jumlah,
      'keterangan': keterangan,
      'penerima': penerima,
      'status': 'pending',
      'diajukan_oleh': user?.id,
    });
  }

  // ---------- ANGGARAN ----------
  Future<List<Anggaran>> getAnggaranList(int tahun) async {
    final rows = await _db
        .from('anggaran')
        .select('*, kategori:kategori_id(nama)')
        .eq('tahun', tahun)
        .order('bulan');
    return (rows as List).map((e) => Anggaran.fromMap(e)).toList();
  }
}
