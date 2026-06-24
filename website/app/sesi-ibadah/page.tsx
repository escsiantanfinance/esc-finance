'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, formatRupiah, formatTanggal, type SesiIbadah } from '@/lib/supabase'

const STATUS_BADGE: Record<string, { c: string; t: string }> = {
  draft: { c: 'bg-amber-100 text-amber-700', t: 'Draft' },
  balanced: { c: 'bg-blue-100 text-blue-700', t: 'Balanced' },
  signed_locked: { c: 'bg-green-100 text-green-700', t: '🔒 Terkunci' },
}

export default function SesiIbadahPage() {
  const [data, setData] = useState<SesiIbadah[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: rows } = await supabase.from('sesi_ibadah')
        .select('*, kas:kas_id(nama)').order('tanggal', { ascending: false }).limit(50)
      if (rows) setData(rows as any)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <main className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Sesi Ibadah</h1>
          <p className="text-gray-500 mt-1">Rekonsiliasi kas pasca-ibadah (dari aplikasi mobile)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{['Tanggal', 'Jenis Ibadah', 'Kas', 'Total Fisik', 'Balancing', 'Status', ''].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Memuat...</td></tr> :
                data.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada sesi ibadah</td></tr> :
                data.map(s => {
                  const match = Number(s.selisih) === 0
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">{formatTanggal(s.tanggal)}{s.jam ? `, ${s.jam.slice(0, 5)}` : ''}</td>
                      <td className="px-4 py-3 font-medium">{s.jenis_ibadah}</td>
                      <td className="px-4 py-3 text-gray-500">{s.kas?.nama ?? '-'}</td>
                      <td className="px-4 py-3 font-semibold">{formatRupiah(s.total_fisik)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{match ? 'MATCH' : 'MISMATCH'}</span>
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[s.status]?.c}`}>{STATUS_BADGE[s.status]?.t}</span></td>
                      <td className="px-4 py-3 text-right"><Link href={`/sesi-ibadah/${s.id}`} className="text-blue-700 font-medium text-xs hover:underline">Lihat →</Link></td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
    </main>
  )
}
