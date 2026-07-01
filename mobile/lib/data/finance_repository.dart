import 'dart:typed_data';
import '../core/config.dart';
import '../core/supabase_client.dart';
import '../models/models.dart';

/// Akses data ke Supabase (mirror logika web).
class FinanceRepository {
  final _db = SupabaseService.client;
  SupabaseClient get client => _db;

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
    final rows = await _db.from('kas').select().eq('is_aktif', true).order('urutan');
    return (rows as List).map((e) => Kas.fromMap(e)).toList();
  }

  Future<List<KategoriPengeluaran>> getKategoriList() async {
    final rows = await _db.from('kategori_pengeluaran').select().eq('is_active', true).order('nama');
    return (rows as List).map((e) => KategoriPengeluaran.fromMap(e)).toList();
  }

  /// Kategori persembahan aktif (custom Super Admin), tiap kategori menuju satu kas.
  Future<List<KategoriPersembahan>> getKategoriPersembahanList() async {
    final rows = await _db
        .from('kategori_persembahan')
        .select('*, kas:kas_id(nama)')
        .eq('is_aktif', true)
        .order('urutan');
    return (rows as List).map((e) => KategoriPersembahan.fromMap(e)).toList();
  }

  /// Kas yang diizinkan Super Admin untuk diakses user saat ini (selain admin/super admin yang akses semua).
  Future<Set<String>> getKasAksesIds() async {
    final user = SupabaseService.currentUser;
    if (user == null) return {};
    final rows = await _db.from('kas_akses').select('kas_id').eq('user_id', user.id);
    return (rows as List).map((e) => e['kas_id'] as String).toSet();
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
    required String namaSesi,
    required String jenisIbadah,
    required String tanggal,
    String? jam,
    String? kasId,
  }) async {
    final user = SupabaseService.currentUser;
    final data = await _db.from('sesi_ibadah').insert({
      'nama_sesi': namaSesi,
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

  /// Simpan kategori persembahan untuk sesi (replace set). kas_id tiap baris
  /// terisi otomatis oleh trigger dari kategori.kas_id. Trigger lain hitung total_kategori.
  Future<void> savePersembahanKategori(
    String sesiId,
    String tanggal,
    List<KategoriEntry> kategori,
  ) async {
    await _db.from('persembahan').delete().eq('sesi_id', sesiId);
    final rows = <Map<String, dynamic>>[];
    for (final k in kategori) {
      if (k.butuhNama) {
        for (final item in k.items) {
          if (item.jumlah <= 0) continue;
          rows.add({
            'sesi_id': sesiId,
            'tanggal': tanggal,
            'kategori_id': k.kategoriId,
            'jumlah': item.jumlah,
            'nama_pemberi': item.nama.trim().isEmpty ? null : item.nama.trim(),
          });
        }
      } else if (k.total > 0) {
        rows.add({
          'sesi_id': sesiId,
          'tanggal': tanggal,
          'kategori_id': k.kategoriId,
          'jumlah': k.total,
        });
      }
    }
    if (rows.isNotEmpty) {
      await _db.from('persembahan').insert(rows);
    }
  }

  /// Muat denominasi tersimpan (untuk lanjutkan draft)
  Future<Map<int, int>> getPecahan(String sesiId) async {
    final rows = await _db.from('sesi_pecahan').select('nominal, jumlah_lembar').eq('sesi_id', sesiId);
    final map = <int, int>{};
    for (final r in (rows as List)) {
      map[(r['nominal'] as num).toInt()] = (r['jumlah_lembar'] as num?)?.toInt() ?? 0;
    }
    return map;
  }

  /// Muat baris persembahan mentah suatu sesi (untuk lanjutkan draft) —
  /// dikelompokkan per kategori di sisi provider karena perlu tahu butuhNama.
  Future<List<Map<String, dynamic>>> getPersembahanRows(String sesiId) async {
    final rows = await _db
        .from('persembahan')
        .select('kategori_id, jumlah, nama_pemberi')
        .eq('sesi_id', sesiId);
    return (rows as List).cast<Map<String, dynamic>>();
  }

  /// Hapus sesi (draft/balanced) beserta persembahan & denominasinya.
  /// Persembahan dihapus lebih dulu agar jurnal & saldo otomatis pulih.
  Future<void> deleteSesi(String sesiId) async {
    await _db.from('persembahan').delete().eq('sesi_id', sesiId);
    await _db.from('sesi_ibadah').delete().eq('id', sesiId);
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

  /// Kunci sesi setelah balanced & ditandatangani 4 pihak.
  Future<void> lockSesi(
    String sesiId, {
    required String namaPenghitung1,
    required String ttdPenghitung1Url,
    required String namaPenghitung2,
    required String ttdPenghitung2Url,
    required String namaBendahara,
    required String ttdBendaharaUrl,
    required String namaGembala,
    required String ttdGembalaUrl,
  }) async {
    await _db.from('sesi_ibadah').update({
      'nama_penghitung1': namaPenghitung1,
      'ttd_penghitung1_url': ttdPenghitung1Url,
      'nama_penghitung2': namaPenghitung2,
      'ttd_penghitung2_url': ttdPenghitung2Url,
      'nama_bendahara': namaBendahara,
      'ttd_bendahara_url': ttdBendaharaUrl,
      'nama_gembala': namaGembala,
      'ttd_gembala_url': ttdGembalaUrl,
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

  /// "Kartu Biru" — pengeluaran tunai yang dicatat langsung saat hitung sesi.
  /// Masuk sebagai pending; ikut rekonsiliasi sesi lewat trigger di server.
  Future<String> addSesiPengeluaran({
    required String sesiId,
    required double jumlah,
    required String keterangan,
    String? kategoriId,
    String? kasId,
    String? penerima,
  }) async {
    final user = SupabaseService.currentUser;
    final data = await _db.from('pengeluaran').insert({
      'sesi_id': sesiId,
      'kategori_id': kategoriId,
      'kas_id': kasId,
      'jumlah': jumlah,
      'keterangan': keterangan,
      'penerima': penerima,
      'status': 'pending',
      'diajukan_oleh': user?.id,
    }).select('id').single();
    return data['id'] as String;
  }

  Future<void> deleteSesiPengeluaran(String id) async {
    await _db.from('pengeluaran').delete().eq('id', id);
  }

  /// Muat "Kartu Biru" tersimpan suatu sesi (untuk lanjutkan draft)
  Future<List<Pengeluaran>> getSesiPengeluaran(String sesiId) async {
    final rows = await _db
        .from('pengeluaran')
        .select('*, kategori:kategori_id(nama), kas:kas_id(nama)')
        .eq('sesi_id', sesiId)
        .order('created_at');
    return (rows as List).map((e) => Pengeluaran.fromMap(e)).toList();
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
