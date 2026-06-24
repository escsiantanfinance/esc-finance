'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase, formatRupiah } from '@/lib/supabase'
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const DONUT_COLORS = ['#1E40AF', '#059669', '#D97706', '#7C3AED', '#DC2626', '#0891B2', '#DB2777', '#65A30D']

function monthLabel(b: string) {
  return new Date(b).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
}

export default function AnalitikKasPage() {
  const [rows, setRows] = useState<any[]>([])
  const [kas, setKas] = useState<any[]>([])
  const [sel, setSel] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: a }, { data: k }] = await Promise.all([
        supabase.from('v_analitik_kas').select('*'),
        supabase.from('kas').select('id,nama,saldo_saat_ini,tipe,is_aktif').order('created_at'),
      ])
      setRows((a ?? []).filter((r: any) => r.bulan)) // buang baris tanpa transaksi
      setKas(k ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(
    () => (sel === 'all' ? rows : rows.filter(r => r.kas_id === sel)),
    [rows, sel]
  )

  // Agregasi per bulan (gabung semua kas bila 'all')
  const perBulan = useMemo(() => {
    const map: Record<string, { bulan: string; masuk: number; keluar: number }> = {}
    for (const r of filtered) {
      const key = r.bulan
      if (!map[key]) map[key] = { bulan: key, masuk: 0, keluar: 0 }
      map[key].masuk += Number(r.masuk ?? 0)
      map[key].keluar += Number(r.keluar ?? 0)
    }
    return Object.values(map)
      .sort((a, b) => a.bulan.localeCompare(b.bulan))
      .map(m => ({ label: monthLabel(m.bulan), Masuk: m.masuk, Keluar: m.keluar, Bersih: m.masuk - m.keluar }))
  }, [filtered])

  const totalMasuk = perBulan.reduce((s, m) => s + m.Masuk, 0)
  const totalKeluar = perBulan.reduce((s, m) => s + m.Keluar, 0)
  const kasAktif = kas.filter(k => k.is_aktif)
  const totalSaldo = (sel === 'all' ? kasAktif : kas.filter(k => k.id === sel))
    .reduce((s, k) => s + Number(k.saldo_saat_ini ?? 0), 0)

  const donutData = kasAktif
    .map(k => ({ name: k.nama, value: Number(k.saldo_saat_ini ?? 0) }))
    .filter(d => d.value > 0)

  return (
    <main className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analitik Kas</h1>
            <p className="text-gray-500 mt-1">Likuiditas & mutasi tiap pos kas</p>
          </div>
          <select value={sel} onChange={e => setSel(e.target.value)} className="border rounded-xl px-3 py-2 text-sm">
            <option value="all">Semua pos kas</option>
            {kas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>

        {loading ? <p className="text-center text-gray-400 py-10">Memuat…</p> : (
          <>
            {/* Ringkasan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-700 text-white rounded-2xl p-5">
                <p className="text-blue-200 text-sm">Saldo {sel === 'all' ? 'total (aktif)' : 'kas ini'}</p>
                <p className="text-2xl font-bold">{formatRupiah(totalSaldo)}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                <p className="text-green-600 text-sm">Total kas masuk</p>
                <p className="text-2xl font-bold text-green-700">{formatRupiah(totalMasuk)}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <p className="text-red-600 text-sm">Total kas keluar</p>
                <p className="text-2xl font-bold text-red-700">{formatRupiah(totalKeluar)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              {/* Donut komposisi saldo */}
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h2 className="font-semibold text-lg mb-2">Komposisi Saldo Antar-Kas</h2>
                {donutData.length === 0 ? <p className="text-gray-400 text-sm py-16 text-center">Belum ada saldo</p> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                        {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatRupiah(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Bar masuk vs keluar */}
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h2 className="font-semibold text-lg mb-2">Kas Masuk vs Keluar / Bulan</h2>
                {perBulan.length === 0 ? <p className="text-gray-400 text-sm py-16 text-center">Belum ada mutasi</p> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={perBulan}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" fontSize={12} />
                      <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} fontSize={12} />
                      <Tooltip formatter={(v: number) => formatRupiah(v)} />
                      <Legend />
                      <Bar dataKey="Masuk" fill="#059669" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="Keluar" fill="#DC2626" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Tren arus bersih */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-5">
              <h2 className="font-semibold text-lg mb-2">Tren Arus Kas Bersih</h2>
              {perBulan.length === 0 ? <p className="text-gray-400 text-sm py-12 text-center">Belum ada mutasi</p> : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={perBulan}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} fontSize={12} />
                    <Tooltip formatter={(v: number) => formatRupiah(v)} />
                    <Line type="monotone" dataKey="Bersih" stroke="#1E40AF" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Tabel mutasi per kas per bulan */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50"><h2 className="font-semibold text-gray-700">Mutasi per Pos Kas</h2></div>
              <table className="w-full text-sm">
                <thead className="bg-white border-b"><tr>{['Kas', 'Bulan', 'Masuk', 'Keluar', 'Bersih'].map(h => <th key={h} className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">Belum ada mutasi kas</td></tr> :
                    [...filtered].sort((a, b) => String(b.bulan).localeCompare(String(a.bulan))).map((r, i) => {
                      const masuk = Number(r.masuk ?? 0), keluar = Number(r.keluar ?? 0)
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-5 py-2.5 font-medium">{r.kas_nama}</td>
                          <td className="px-5 py-2.5 text-gray-500">{monthLabel(r.bulan)}</td>
                          <td className="px-5 py-2.5 text-green-700">{formatRupiah(masuk)}</td>
                          <td className="px-5 py-2.5 text-red-600">{formatRupiah(keluar)}</td>
                          <td className="px-5 py-2.5 font-semibold">{formatRupiah(masuk - keluar)}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </>
        )}
    </main>
  )
}
