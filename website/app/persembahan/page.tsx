'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah, formatTanggal, type Persembahan } from '@/lib/supabase'
import { exportToExcel } from '@/lib/export-excel'
import ScopeBanner from '@/components/ScopeBanner'

export default function PersembahanPage() {
  const [data, setData] = useState<Persembahan[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const { data: rows } = await supabase
        .from('persembahan')
        .select('*, kas:kas_id(nama), anggota:anggota_id(nama), kategori:kategori_id(nama), pencatat:dicatat_oleh(full_name)')
        .gte('tanggal', start)
        .order('tanggal', { ascending: false })
      if (rows) { setData(rows as any); setTotal(rows.reduce((s, r: any) => s + Number(r.jumlah), 0)) }
      setLoading(false)
    }
    load()
  }, [])

  function handleExport() {
    exportToExcel(
      data.map(r => ({
        Tanggal: r.tanggal,
        Kategori: r.kategori?.nama ?? '-',
        Jumlah: r.jumlah,
        Pemberi: r.nama_pemberi ?? 'Anonim',
        'Diinput oleh': (r as any).pencatat?.full_name ?? '-',
        Kas: r.kas?.nama ?? '-',
        Metode: r.metode_pembayaran,
        Terverifikasi: r.is_verified ? 'Ya' : 'Belum',
      })),
      'persembahan', 'Persembahan'
    )
  }

  return (
    <main className="flex-1 p-8">
        <ScopeBanner />
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Persembahan</h1>
            <p className="text-gray-500 mt-1">Data bulan ini</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExport} className="border border-gray-300 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">⬇ Export Excel</button>
            <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-3 text-right">
              <p className="text-xs text-green-600">Total Bulan Ini</p>
              <p className="text-xl font-bold text-green-700">{formatRupiah(total)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Tanggal', 'Kategori', 'Jumlah', 'Pemberi', 'Diinput oleh', 'Kas', 'Metode', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Belum ada data</td></tr>
              ) : data.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{formatTanggal(row.tanggal)}</td>
                  <td className="px-4 py-3">{row.kategori?.nama ?? '-'}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{formatRupiah(row.jumlah)}</td>
                  <td className="px-4 py-3 text-gray-500">{row.nama_pemberi ?? 'Anonim'}</td>
                  <td className="px-4 py-3 text-gray-600">{(row as any).pencatat?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{row.kas?.nama ?? '-'}</td>
                  <td className="px-4 py-3 capitalize">{row.metode_pembayaran}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
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
