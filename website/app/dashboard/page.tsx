'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import StatsCard from '@/components/StatsCard'
import { supabase, formatRupiah, type DashboardSummary, type Pengeluaran } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Wallet, TrendingUp, TrendingDown, CalendarDays, CreditCard, ArrowRight, Eye, EyeOff, BarChart3 } from 'lucide-react'

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [pending, setPending] = useState<Pengeluaran[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [showSaldo, setShowSaldo] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: sum }, { data: pend }, { data: chart }, { data: { user } }] = await Promise.all([
        supabase.from('dashboard_summary').select('*').single(),
        supabase.from('pengeluaran').select('*, kategori:kategori_id(nama,warna)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
        supabase.from('ringkasan_bulanan').select('*').limit(6),
        supabase.auth.getUser(),
      ])
      if (sum) setSummary(sum)
      if (pend) setPending(pend)
      if (chart) setChartData(chart.map((r: any) => ({
        bulan: new Date(r.bulan).toLocaleString('id-ID', { month: 'short' }),
        pemasukan: r.total_persembahan,
        pengeluaran: r.total_pengeluaran,
      })))
      if (user) {
        const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        if (p) setUserName(p.full_name?.split(' ')[0] ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  const saldoAtauTitik = (v: number) => showSaldo ? formatRupiah(v) : 'Rp ••••••••'

  const skeletonCard = () => (
    <div className="bg-white rounded-2xl overflow-hidden shadow-card border border-indigo-50">
      <div className="h-1.5 w-full bg-gray-100 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-7 w-32 bg-gray-200 rounded-full animate-pulse" />
      </div>
    </div>
  )

  return (
    <main className="flex-1 p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          {userName ? `Halo, ${userName} 👋` : 'Dashboard'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">Ringkasan keuangan ESC Siantan</p>
      </div>

      {loading ? (
        <>
          <div className="h-40 rounded-2xl bg-indigo-100/70 animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <div key={i}>{skeletonCard()}</div>)}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => <div key={i} className="h-72 bg-white rounded-2xl shadow-card animate-pulse border border-indigo-50" />)}
          </div>
        </>
      ) : (
        <>
          {/* Hero — Total Saldo */}
          <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 mb-6 text-white"
            style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 60%, #7c3aed 100%)',
              boxShadow: '0 16px 40px rgba(79,70,229,0.30)',
            }}>
            <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full bg-white/10" />
            <div className="absolute top-16 right-28 w-20 h-20 rounded-full bg-white/[0.07]" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="grid place-items-center w-9 h-9 rounded-xl bg-white/15">
                    <Wallet className="w-[18px] h-[18px] text-white" />
                  </div>
                  <span className="text-sm font-medium text-indigo-200">Total Saldo Kas</span>
                </div>
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums truncate">
                  {saldoAtauTitik(summary?.total_saldo ?? 0)}
                </p>
                <p className="text-xs text-indigo-200/70 mt-2.5">Posisi gabungan seluruh kas per hari ini</p>
              </div>
              <button
                onClick={() => setShowSaldo(s => !s)}
                aria-label={showSaldo ? 'Sembunyikan saldo' : 'Tampilkan saldo'}
                title={showSaldo ? 'Sembunyikan saldo' : 'Tampilkan saldo'}
                className="grid place-items-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-colors shrink-0"
              >
                {showSaldo
                  ? <EyeOff className="w-[18px] h-[18px] text-indigo-100" />
                  : <Eye className="w-[18px] h-[18px] text-indigo-100" />}
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatsCard icon={TrendingUp}    title="Pemasukan Bulan Ini"     value={saldoAtauTitik(summary?.pemasukan_bulan_ini ?? 0)}    color="emerald" trend="up" />
            <StatsCard icon={TrendingDown}  title="Pengeluaran Bulan Ini"   value={saldoAtauTitik(summary?.pengeluaran_bulan_ini ?? 0)}  color="rose"    />
            <StatsCard icon={CalendarDays}  title="Pemasukan Tahun Ini"     value={saldoAtauTitik(summary?.pemasukan_tahun_ini ?? 0)}    color="violet"  />
            <StatsCard icon={CreditCard}    title="Pengeluaran Tahun Ini"   value={saldoAtauTitik(summary?.pengeluaran_tahun_ini ?? 0)}  color="amber"   />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-base">Arus Keuangan</h2>
                  <p className="text-xs text-gray-400 mt-0.5">6 bulan terakhir</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />Masuk</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" />Keluar</span>
                </div>
              </div>
              {chartData.length === 0 ? (
                <div className="h-[220px] flex flex-col items-center justify-center text-center">
                  <div className="grid place-items-center w-14 h-14 rounded-2xl bg-brand-50 mb-3">
                    <BarChart3 className="w-6 h-6 text-brand-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Belum ada data</p>
                  <p className="text-xs text-gray-400 mt-1">Grafik muncul setelah sesi ibadah pertama dicatat</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(0)}jt`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: number) => formatRupiah(v)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: '12px' }}
                    />
                    <Bar dataKey="pemasukan"   fill="#6366f1" radius={[6,6,0,0]} />
                    <Bar dataKey="pengeluaran" fill="#f87171" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pending approvals */}
            <div className="card p-6 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-gray-900 text-base">Menunggu Persetujuan</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Pengeluaran pending</p>
                </div>
                <div className="flex items-center gap-3">
                  {pending.length > 0 && (
                    <span className="badge badge-amber">{pending.length} item</span>
                  )}
                  <Link href="/pengeluaran"
                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                    Lihat semua <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
              {pending.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <div className="grid place-items-center w-14 h-14 rounded-2xl bg-emerald-50 mb-3">
                    <span className="text-2xl">✅</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Semua bersih!</p>
                  <p className="text-xs text-gray-400 mt-1">Tidak ada pengeluaran pending</p>
                </div>
              ) : (
                <div className="space-y-2.5 flex-1">
                  {pending.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3.5 rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-gray-800 truncate">{p.keterangan}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{p.tanggal}</p>
                      </div>
                      <div className="ml-3 text-right shrink-0">
                        <span className="font-bold text-rose-600 text-sm">{formatRupiah(p.jumlah)}</span>
                        <div className="badge badge-yellow mt-1">pending</div>
                      </div>
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
