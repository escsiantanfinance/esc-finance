import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client (cookie-based session, dipakai di Client Components)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// ============================================================
// TYPES
// ============================================================
export type UserRole = 'bendahara' | 'majelis' | 'admin' | 'volunteer'
export type OfferingType = 'perpuluhan' | 'persembahan_umum' | 'janji_iman' | 'persembahan_khusus' | 'kolekte' | 'lainnya'
export type ExpenseStatus = 'pending' | 'disetujui' | 'ditolak'
export type AkunTipe = 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban'
export type SesiStatus = 'draft' | 'balanced' | 'signed_locked'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  is_super_admin: boolean
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
  saldo_awal: number
  saldo_saat_ini: number
  tipe: string
  nomor_rekening?: string
  nama_bank?: string
  keterangan?: string
  is_aktif: boolean
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
  jenis_ibadah: string
  tanggal: string
  jam?: string
  ibadah_ke?: number
  kas_id?: string
  status: SesiStatus
  total_fisik: number
  total_kategori: number
  selisih: number
  nama_gembala?: string
  ttd_gembala_url?: string
  nama_saksi?: string
  ttd_saksi_url?: string
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
  jenis: OfferingType
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
// LABELS & HELPERS
// ============================================================
export const OFFERING_LABELS: Record<OfferingType, string> = {
  perpuluhan: 'Perpuluhan',
  persembahan_umum: 'Persembahan Umum',
  janji_iman: 'Janji Iman',
  persembahan_khusus: 'Persembahan Khusus',
  kolekte: 'Kolekte',
  lainnya: 'Lainnya',
}

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
