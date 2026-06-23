import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;

/// Penyimpanan lokal sementara (PRD §4 "Penyimpanan Lokal Sementara").
/// Menyimpan draft sesi yang sedang dihitung (denominasi + kategori) agar
/// tidak hilang bila aplikasi tertutup / baterai habis sebelum upload.
/// Dihapus setelah sync sukses.
class LocalDraftStore {
  static Database? _db;
  static const _table = 'draft_sesi';

  static Future<Database> _open() async {
    if (_db != null) return _db!;
    final path = p.join(await getDatabasesPath(), 'esc_finance.db');
    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, _) async {
        await db.execute('''
          CREATE TABLE $_table (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            payload TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          )
        ''');
      },
    );
    return _db!;
  }

  /// Simpan / timpa draft aktif (selalu 1 baris).
  static Future<void> save(Map<String, dynamic> payload) async {
    final db = await _open();
    await db.insert(
      _table,
      {
        'id': 1,
        'payload': jsonEncode(payload),
        'updated_at': DateTime.now().millisecondsSinceEpoch,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Ambil draft aktif (null bila tidak ada).
  static Future<Map<String, dynamic>?> load() async {
    final db = await _open();
    final rows = await db.query(_table, where: 'id = 1', limit: 1);
    if (rows.isEmpty) return null;
    return jsonDecode(rows.first['payload'] as String) as Map<String, dynamic>;
  }

  /// Hapus draft setelah sesi terkunci & tersinkron.
  static Future<void> clear() async {
    final db = await _open();
    await db.delete(_table, where: 'id = 1');
  }
}
