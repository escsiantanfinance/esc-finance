'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import StatsCard from '@/components/StatsCard'
import { supabase, formatRupiah, type DashboardSummary, type Pengeluaran } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [pending, setPending] = useState<Pengeluaran[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: sum }, { data: pend }, { data: chart }] = await Promise.all([
        supabase.from('dashboard_summary').select('*').single(),
        supabase.from('pengeluaran').select('*, kategori:kategori_id(nama,warna)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
        supabase.from('ringkasan_bulanan').select('*').limit(6),
      ])
      if (sum) setSummary(sum)
      if (pend) setPending(pend)
      if (chart) setChartData(chart.map((r: any) => ({
        bulan: new Date(r.bulan).toLocaleString('id-ID', { month: 'short' }),
        pemasukan: r.total_persembahan,
        pengeluaran: r.total_pengeluaran,
      })))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Ringkasan keuangan ESC Finance</p>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-72 bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
              <StatsCard title="Total Saldo" value={formatRupiah(summary?.total_saldo ?? 0)} icon="🏦" color="blue" />
              <StatsCard title="Pemasukan Bulan Ini" value={formatRupiah(summary?.pemasukan_bulan_ini ?? 0)} icon="📈" color="green" />
              <StatsCard title="Pengeluaran Bulan Ini" value={formatRupiah(summary?.pengeluaran_bulan_ini ?? 0)} icon="📉" color="red" />
              <StatsCard title="Pemasukan Tahun Ini" value={formatRupiah(summary?.pemasukan_tahun_ini ?? 0)} icon="📅" color="blue" />
              <StatsCard title="Pengeluaran Tahun Ini" value={formatRupiah(summary?.pengeluaran_tahun_ini ?? 0)} icon="💳" color="yellow" />
              <StatsCard title="Menunggu Persetujuan" value={`${summary?.pengeluaran_pending ?? 0} item`} icon="⏳" color="yellow" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Chart */}
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h2 className="font-semibold text-lg mb-4">Trend Pemasukan 6 Bulan</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bulan" />
                    <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(0)}jt`} />
                    <Tooltip formatter={(v: number) => formatRupiah(v)} />
                    <Legend />
                    <Bar dataKey="pemasukan" fill="#1E40AF" radius={[6,6,0,0]} />
                    <Bar dataKey="pengeluaran" fill="#EF4444" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pending approvals */}
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h2 className="font-semibold text-lg mb-4">Menunggu Persetujuan</h2>
                {pending.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Tidak ada pengeluaran pending</p>
                ) : (
                  <div className="space-y-3">
                    {pending.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                        <div>
                          <p className="font-medium text-sm">{p.keterangan}</p>
                          <p className="text-xs text-gray-500">{p.tanggal}</p>
                        </div>
                        <span className="font-bold text-red-600 text-sm">{formatRupiah(p.jumlah)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
    </main>
  )
}
