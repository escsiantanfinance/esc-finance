import { createBrowserClient } from '@supabase/ssr'

// Browser client (cookie-based session, dipakai di Client Components)
// Fallback placeholder mencegah crash saat build-time prerender Vercel (env vars belum ada).
// Di runtime browser, nilai NEXT_PUBLIC_* yang asli selalu tersedia.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL     ?? 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
)

// ============================================================
// TYPES
// ============================================================
export type UserRole = 'bendahara' | 'majelis' | 'admin' | 'volunteer'
export type ExpenseStatus = 'pending' | 'disetujui' | 'ditolak'
export type AkunTipe = 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban'
export type SesiStatus = 'draft' | 'balanced' | 'signed_locked'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  is_super_admin: boolean
  boleh_approve_pengeluaran?: boolean
  phone?: string
  is_active: boolean
}

export interface Akun {
  id: string
  kode_akun: string
  nama_akun: string
  tipe: AkunTipe
  saldo_normal: 'debit' | 'kredit'
  is_header: boolean
  is_aktif: boolean
}

export interface Kas {
  id: string
  nama: string
  akun_id?: string
  penanggung_jawab?: string
  saldo_awal: number
  saldo_saat_ini: number
  tipe: string
  nomor_rekening?: string
  nama_bank?: string
  keterangan?: string
  urutan?: number
  is_aktif: boolean
}

export interface KategoriPersembahan {
  id: string
  nama: string
  kas_id?: string
  akun_pendapatan_id?: string
  butuh_nama: boolean
  is_perpuluhan: boolean
  warna?: string
  urutan?: number
  is_aktif: boolean
  kas?: { nama: string }
}

export interface KategoriPengeluaran {
  id: string
  nama: string
  deskripsi?: string
  warna: string
  icon?: string
  akun_id?: string
  is_active: boolean
}

export interface Anggota {
  id: string
  nama: string
  kontak?: string
  divisi_pelayanan?: string
  is_volunteer: boolean
  wajib_perpuluhan: boolean
  is_aktif: boolean
}

export interface SesiIbadah {
  id: string
  nama_sesi?: string
  jenis_ibadah: string
  tanggal: string
  jam?: string
  ibadah_ke?: number
  kas_id?: string
  status: SesiStatus
  total_fisik: number
  total_kategori: number
  total_pengeluaran: number
  selisih: number
  nama_gembala?: string
  ttd_gembala_url?: string
  nama_bendahara?: string
  ttd_bendahara_url?: string
  nama_penghitung1?: string
  ttd_penghitung1_url?: string
  nama_penghitung2?: string
  ttd_penghitung2_url?: string
  signed_at?: string
  catatan?: string
  created_at: string
  kas?: { nama: string }
}

export interface SesiPecahan {
  id: string
  sesi_id: string
  nominal: number
  jumlah_lembar: number
  subtotal: number
}

export interface Persembahan {
  id: string
  tanggal: string
  kategori_id: string
  jumlah: number
  kas_id?: string
  sesi_id?: string
  anggota_id?: string
  keterangan?: string
  nama_pemberi?: string
  metode_pembayaran: string
  is_verified: boolean
  created_at: string
  kas?: { nama: string }
  anggota?: { nama: string }
  kategori?: { nama: string }
}

export interface Pengeluaran {
  id: string
  tanggal: string
  jumlah: number
  keterangan: string
  penerima?: string
  kas_id?: string
  status: ExpenseStatus
  catatan_penolakan?: string
  kategori?: { nama: string; warna: string }
  kas?: { nama: string }
  created_at: string
}

export interface Anggaran {
  id: string
  tahun: number
  bulan?: number
  nama_pos: string
  jumlah_dianggarkan: number
  keterangan?: string
  kategori?: { nama: string }
  kategori_id?: string
}

export interface JurnalUmum {
  id: string
  tanggal: string
  keterangan?: string
  sumber: 'persembahan' | 'pengeluaran' | 'manual'
  created_at: string
  detail?: JurnalDetail[]
}

export interface JurnalDetail {
  id: string
  jurnal_id: string
  akun_id: string
  debit: number
  kredit: number
  akun?: { kode_akun: string; nama_akun: string }
}

export interface LogBackup {
  id: string
  tipe: 'manual' | 'otomatis'
  status: 'berjalan' | 'sukses' | 'gagal'
  ukuran_bytes?: number
  storage_path?: string
  format?: string
  pelaksana?: string
  pesan?: string
  created_at: string
}

export interface DashboardSummary {
  pemasukan_bulan_ini: number
  pengeluaran_bulan_ini: number
  pemasukan_tahun_ini: number
  pengeluaran_tahun_ini: number
  pengeluaran_pending: number
  total_saldo: number
}

// ============================================================
// HELPERS
// ============================================================
export function formatRupiah(amount: number | null | undefined): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(amount ?? 0))
}

export function formatTanggal(d: string | null | undefined): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
