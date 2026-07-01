'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah, formatTanggal, type Persembahan } from '@/lib/supabase'
import { exportToExcel } from '@/lib/export-excel'
import ScopeBanner from '@/components/ScopeBanner'
import { Download } from 'lucide-react'

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export default function PersembahanPage() {
  const [data, setData] = useState<Persembahan[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const now = new Date()
  const [tahun, setTahun] = useState(now.getFullYear())
  const [bulan, setBulan] = useState(now.getMonth() + 1)

  async function load() {
    setLoading(true)
    const start = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const end = bulan === 12 ? `${tahun + 1}-01-01` : `${tahun}-${String(bulan + 1).padStart(2, '0')}-01`
    const { data: rows, error } = await supabase
      .from('persembahan')
      .select('*, kas:kas_id(nama), anggota:anggota_id(nama), kategori:kategori_id(nama), pencatat:dicatat_oleh(full_name), sesi:sesi_id(dibuka_oleh(full_name))')
      .gte('tanggal', start)
      .lt('tanggal', end)
      .order('tanggal', { ascending: false })
    if (rows) { setData(rows as any); setTotal(rows.reduce((s, r: any) => s + Number(r.jumlah), 0)) }
    else if (error) console.error(error)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [tahun, bulan])

  function handleExport() {
    exportToExcel(
      data.map(r => ({
        Tanggal: r.tanggal,
        Kategori: r.kategori?.nama ?? '-',
        Jumlah: r.jumlah,
        Pemberi: r.nama_pemberi ?? 'Anonim',
        'Diinput oleh': (r as any).sesi?.dibuka_oleh?.full_name ?? (r as any).pencatat?.full_name ?? '-',
        Kas: r.kas?.nama ?? '-',
        Metode: r.metode_pembayaran,
        Terverifikasi: r.is_verified ? 'Ya' : 'Belum',
      })),
      'persembahan', 'Persembahan'
    )
  }

  return (
    <main className="flex-1 p-6 lg:p-8">
      <ScopeBanner />
      <div className="page-header">
        <div>
          <h1 className="page-title">Persembahan</h1>
          <p className="page-subtitle">Data persembahan masuk per bulan</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <select value={bulan} onChange={e => setBulan(Number(e.target.value))} className="form-input w-auto">
            {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
          </select>
          <select value={tahun} onChange={e => setTahun(Number(e.target.value))} className="form-input w-auto">
            {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" /> Export
          </button>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-2 text-right">
            <p className="text-xs text-emerald-600 font-medium">Total Periode</p>
            <p className="text-lg font-extrabold text-emerald-700">{formatRupiah(total)}</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="tbl-head">
            <tr>
              {['Tanggal', 'Kategori', 'Jumlah', 'Pemberi', 'Diinput oleh', 'Kas', 'Metode', 'Status'].map(h => (
                <th key={h} className="tbl-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-5 py-8">
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="h-4 bg-brand-50 rounded-full w-24 animate-pulse" />
                      <div className="h-4 bg-brand-50 rounded-full flex-1 animate-pulse" />
                      <div className="h-4 bg-brand-50 rounded-full w-20 animate-pulse" />
                    </div>
                  ))}
                </div>
              </td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8} className="py-16 text-center text-gray-400 text-sm">Belum ada data persembahan</td></tr>
            ) : data.map(row => (
              <tr key={row.id} className="tbl-row">
                <td className="tbl-td whitespace-nowrap">{formatTanggal(row.tanggal)}</td>
                <td className="tbl-td font-medium text-gray-800">{row.kategori?.nama ?? '-'}</td>
                <td className="tbl-td font-bold text-emerald-600">{formatRupiah(row.jumlah)}</td>
                <td className="tbl-td text-gray-500">{row.nama_pemberi ?? 'Anonim'}</td>
                <td className="tbl-td text-gray-500">{(row as any).sesi?.dibuka_oleh?.full_name ?? (row as any).pencatat?.full_name ?? '—'}</td>
                <td className="tbl-td text-gray-500">{row.kas?.nama ?? '-'}</td>
                <td className="tbl-td capitalize text-gray-500">{row.metode_pembayaran}</td>
                <td className="tbl-td">
                  <span className={row.is_verified ? 'badge badge-green' : 'badge badge-yellow'}>
                    {row.is_verified ? 'Terverifikasi' : 'Belum'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
