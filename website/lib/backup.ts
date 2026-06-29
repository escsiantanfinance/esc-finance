import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// Tabel yang dicadangkan (urutan dependensi FK untuk restore)
export const BACKUP_TABLES = [
  'profiles', 'akun', 'kas', 'kas_akses', 'kategori_persembahan', 'kategori_pengeluaran', 'anggota',
  'sesi_ibadah', 'sesi_pecahan', 'persembahan', 'pengeluaran', 'anggaran',
  'jurnal_umum', 'jurnal_umum_detail',
]
const BUCKET = 'backups'

// Kolom generated (tidak boleh di-insert saat restore)
const GENERATED_COLS = ['subtotal', 'selisih']

export async function buildBackupZip(admin: SupabaseClient): Promise<Buffer> {
  const wb = XLSX.utils.book_new()
  const jsonDump: Record<string, any[]> = {}
  for (const t of BACKUP_TABLES) {
    const { data } = await admin.from(t).select('*')
    const rows = data ?? []
    jsonDump[t] = rows
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}])
    XLSX.utils.book_append_sheet(wb, ws, t.slice(0, 31))
  }
  const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const zip = new JSZip()
  zip.file('backup.xlsx', xlsxBuf)
  zip.file('backup.json', JSON.stringify(jsonDump, null, 2))
  return zip.generateAsync({ type: 'nodebuffer' })
}

// AES-256-GCM. Output: iv(12) + tag(16) + ciphertext
export function encryptBuffer(buf: Buffer): Buffer {
  const key = crypto.createHash('sha256').update(process.env.BACKUP_ENCRYPTION_KEY ?? 'esc-default-key').digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(buf), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), enc])
}

export async function runBackup(
  admin: SupabaseClient,
  tipe: 'manual' | 'otomatis',
  pelaksana: string
): Promise<{ path: string; size: number }> {
  try {
    const zip = await buildBackupZip(admin)
    const enc = encryptBuffer(zip)
    const path = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip.enc`
    const { error } = await admin.storage.from(BUCKET).upload(path, enc, {
      contentType: 'application/octet-stream', upsert: false,
    })
    if (error) throw error
    await admin.from('log_backup').insert({
      tipe, status: 'sukses', ukuran_bytes: enc.length, storage_path: path, pelaksana,
    })
    return { path, size: enc.length }
  } catch (e: any) {
    await admin.from('log_backup').insert({ tipe, status: 'gagal', pelaksana, pesan: e.message })
    throw e
  }
}

// Retensi: hapus backup harian >30 hari, simpan 1 per bulan (s/d 12 bulan)
export async function cleanupRetention(admin: SupabaseClient) {
  const cutoff = new Date(Date.now() - 30 * 864e5).toISOString()
  const { data: old } = await admin.from('log_backup')
    .select('id, created_at, storage_path').lt('created_at', cutoff)
    .eq('status', 'sukses').order('created_at', { ascending: true })
  if (!old) return
  const keptMonths = new Set<string>()
  for (const b of old) {
    const month = (b.created_at as string).slice(0, 7)
    if (!keptMonths.has(month)) { keptMonths.add(month); continue } // simpan yang pertama tiap bulan
    if (b.storage_path) await admin.storage.from(BUCKET).remove([b.storage_path])
    await admin.from('log_backup').delete().eq('id', b.id)
  }
}

// Parse file .xlsx upload → { tabel: rows[] }
export function parseBackupXlsx(buf: Buffer): Record<string, any[]> {
  const wb = XLSX.read(buf, { type: 'buffer' })
  const out: Record<string, any[]> = {}
  for (const name of wb.SheetNames) {
    out[name] = XLSX.utils.sheet_to_json(wb.Sheets[name])
  }
  return out
}

function strip(row: any): any {
  const r = { ...row }
  for (const c of GENERATED_COLS) delete r[c]
  return r
}

// Restore upsert aman: master dulu, lalu transaksi (jurnal di-rebuild trigger)
export async function restoreFromParsed(admin: SupabaseClient, parsed: Record<string, any[]>) {
  const summary: Record<string, number> = {}
  const order = ['profiles', 'akun', 'kas', 'kas_akses', 'kategori_persembahan', 'kategori_pengeluaran', 'anggota',
    'sesi_ibadah', 'sesi_pecahan', 'persembahan', 'pengeluaran', 'anggaran']
  for (const table of order) {
    let rows = parsed[table]
    if (!rows || rows.length === 0) continue
    // sesi_ibadah: paksa status draft agar tidak memblokir insert anak
    if (table === 'sesi_ibadah') rows = rows.map(r => ({ ...r, status: 'draft' }))
    const clean = rows.map(strip)
    const { error } = await admin.from(table).upsert(clean, { onConflict: 'id' })
    if (error) throw new Error(`${table}: ${error.message}`)
    summary[table] = clean.length
  }
  return summary
}
