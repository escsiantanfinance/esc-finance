'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { supabase, formatRupiah, type Anggaran } from '@/lib/supabase'
import { exportToExcel } from '@/lib/export-excel'

export default function AnggaranPage() {
  const [data, setData] = useState<Anggaran[]>([])
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: rows } = await supabase.from('anggaran')
        .select('*, kategori:kategori_id(nama)').eq('tahun', tahun).order('bulan')
      if (rows) setData(rows)
      setLoading(false)
    }
    load()
  }, [tahun])

  const totalAnggaran = data.reduce((s, r) => s + r.jumlah_dianggarkan, 0)
  const grouped = data.reduce((acc, r) => {
    const key = r.kategori?.nama ?? 'Umum'
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {} as Record<string, Anggaran[]>)

  function handleExport() {
    exportToExcel(
      data.map(r => ({
        Kategori: r.kategori?.nama ?? 'Umum',
        Pos: r.nama_pos,
        Periode: r.bulan ? `Bulan ${r.bulan}` : 'Tahunan',
        Dianggarkan: r.jumlah_dianggarkan,
        Keterangan: r.keterangan ?? '',
      })),
      `anggaran_${tahun}`, 'Anggaran'
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-6 flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Anggaran</h1>
            <p className="text-gray-500 mt-1">Perencanaan keuangan tahunan</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleExport} className="border border-gray-300 rounded-xl px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">⬇ Export Excel</button>
            <select value={tahun} onChange={e => setTahun(Number(e.target.value))} className="border rounded-xl px-3 py-1.5 text-sm">
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-blue-700 text-white rounded-2xl p-5 mb-6 flex items-center gap-4">
          <span className="text-4xl">📋</span>
          <div>
            <p className="text-blue-200 text-sm">Total Anggaran {tahun}</p>
            <p className="text-3xl font-bold">{formatRupiah(totalAnggaran)}</p>
          </div>
        </div>

        {loading ? <p className="text-center text-gray-400">Memuat...</p> :
          Object.entries(grouped).map(([kategori, items]) => (
            <div key={kategori} className="bg-white rounded-2xl shadow-sm border mb-4 overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b">
                <h3 className="font-semibold text-gray-700">{kategori}</h3>
                <p className="text-xs text-gray-500">{formatRupiah(items.reduce((s,r) => s+r.jumlah_dianggarkan,0))}</p>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {items.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium">{row.nama_pos}</td>
                      <td className="px-5 py-3 text-gray-500">{row.bulan ? `Bulan ${row.bulan}` : 'Tahunan'}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{row.keterangan ?? ''}</td>
                      <td className="px-5 py-3 text-right font-bold text-blue-700">{formatRupiah(row.jumlah_dianggarkan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        }
      </main>
    </div>
  )
}
