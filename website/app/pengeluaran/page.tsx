'use client'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah, formatTanggal, type Pengeluaran } from '@/lib/supabase'
import { exportToExcel } from '@/lib/export-excel'

const statusStyle: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  disetujui: 'bg-green-100 text-green-700',
  ditolak: 'bg-red-100 text-red-700',
}

export default function PengeluaranPage() {
  const [data, setData] = useState<Pengeluaran[]>([])
  const [filter, setFilter] = useState<string>('semua')
  const [loading, setLoading] = useState(true)

  async function load() {
    let query = supabase.from('pengeluaran')
      .select('*, kategori:kategori_id(nama,warna), kas:kas_id(nama)')
      .order('tanggal', { ascending: false })
    if (filter !== 'semua') query = query.eq('status', filter)
    const { data: rows } = await query
    if (rows) setData(rows as any)
    setLoading(false)
  }

  async function approve(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('pengeluaran').update({
      status: 'disetujui',
      disetujui_oleh: user?.id ?? null,
      disetujui_pada: new Date().toISOString(),
    }).eq('id', id)
    load()
  }

  async function reject(id: string) {
    const catatan = prompt('Alasan penolakan:')
    if (!catatan) return
    await supabase.from('pengeluaran').update({ status: 'ditolak', catatan_penolakan: catatan }).eq('id', id)
    load()
  }

  function handleExport() {
    exportToExcel(
      data.map(r => ({
        Tanggal: r.tanggal,
        Keterangan: r.keterangan,
        Kategori: r.kategori?.nama ?? '-',
        Kas: r.kas?.nama ?? '-',
        Jumlah: r.jumlah,
        Status: r.status,
        Penerima: r.penerima ?? '-',
      })),
      'pengeluaran', 'Pengeluaran'
    )
  }

  useEffect(() => { load() }, [filter])

  return (
    <main className="flex-1 p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pengeluaran</h1>
            <div className="flex gap-2 mt-4">
              {['semua', 'pending', 'disetujui', 'ditolak'].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize
                    ${filter === s ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleExport} className="border border-gray-300 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">⬇ Export Excel</button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Tanggal', 'Keterangan', 'Kategori', 'Kas', 'Jumlah', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Memuat...</td></tr>
              ) : data.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{formatTanggal(row.tanggal)}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{row.keterangan}</td>
                  <td className="px-4 py-3 text-gray-500">{row.kategori?.nama ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{row.kas?.nama ?? '-'}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{formatRupiah(row.jumlah)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle[row.status]}`}>{row.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {row.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => approve(row.id)} className="text-green-600 hover:underline text-xs font-medium">✓ Setujui</button>
                        <button onClick={() => reject(row.id)} className="text-red-500 hover:underline text-xs font-medium">✗ Tolak</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </main>
  )
}
