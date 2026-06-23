'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { supabase, formatRupiah } from '@/lib/supabase'
import { exportSheets } from '@/lib/export-excel'

type Tab = 'aktivitas' | 'neraca' | 'aruskas'

export default function LaporanPage() {
  const [tab, setTab] = useState<Tab>('aktivitas')
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [aktivitas, setAktivitas] = useState<any[]>([])
  const [neraca, setNeraca] = useState<any[]>([])
  const [arusKas, setArusKas] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const [{ data: a }, { data: n }, { data: c }] = await Promise.all([
        supabase.from('v_laporan_aktivitas').select('*').eq('tahun', tahun),
        supabase.from('v_neraca').select('*'),
        supabase.from('v_arus_kas').select('*'),
      ])
      setAktivitas(a ?? [])
      setNeraca(n ?? [])
      setArusKas(c ?? [])
    }
    load()
  }, [tahun])

  // Aktivitas: agregasi per akun (gabung semua bulan di tahun terpilih)
  const aggAktivitas = aggregateByAkun(aktivitas)
  const pendapatan = aggAktivitas.filter(r => r.tipe === 'pendapatan')
  const beban = aggAktivitas.filter(r => r.tipe === 'beban')
  const totalPendapatan = pendapatan.reduce((s, r) => s + r.nilai, 0)
  const totalBeban = beban.reduce((s, r) => s + r.nilai, 0)
  const surplus = totalPendapatan - totalBeban

  const aset = neraca.filter(r => r.tipe === 'aset')
  const kewajiban = neraca.filter(r => r.tipe === 'kewajiban')
  const ekuitas = neraca.filter(r => r.tipe === 'ekuitas')
  const totalAset = aset.reduce((s, r) => s + Number(r.saldo), 0)

  function handleExport() {
    exportSheets([
      { name: 'Laporan Aktivitas', rows: aggAktivitas.map(r => ({ Kode: r.kode_akun, Akun: r.nama_akun, Tipe: r.tipe, Nilai: r.nilai })) },
      { name: 'Neraca', rows: neraca.map(r => ({ Kode: r.kode_akun, Akun: r.nama_akun, Tipe: r.tipe, Saldo: r.saldo })) },
      { name: 'Arus Kas', rows: arusKas.map(r => ({ Kas: r.kas_nama, Bulan: r.bulan, Masuk: r.kas_masuk, Keluar: r.kas_keluar, Bersih: r.arus_bersih })) },
    ], `laporan_keuangan_${tahun}`)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Laporan Keuangan</h1>
            <p className="text-gray-500 mt-1">3 laporan standar akuntansi nirlaba</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={tahun} onChange={e => setTahun(Number(e.target.value))} className="border rounded-xl px-3 py-2 text-sm">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleExport} className="border border-gray-300 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">⬇ Export Excel</button>
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          {([['aktivitas', '📈 Laporan Aktivitas'], ['neraca', '⚖️ Neraca'], ['aruskas', '💧 Arus Kas']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === k ? 'bg-blue-700 text-white' : 'bg-white border text-gray-600'}`}>{l}</button>
          ))}
        </div>

        {/* AKTIVITAS */}
        {tab === 'aktivitas' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-3xl">
            <h2 className="font-semibold text-lg mb-4">Laporan Aktivitas — {tahun}</h2>
            <Section title="Pendapatan" rows={pendapatan} color="text-green-700" />
            <Row label="Total Pendapatan" value={totalPendapatan} bold color="text-green-700" />
            <div className="h-4" />
            <Section title="Beban" rows={beban} color="text-red-600" />
            <Row label="Total Beban" value={totalBeban} bold color="text-red-600" />
            <div className={`flex justify-between mt-5 p-4 rounded-xl font-bold ${surplus >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <span>{surplus >= 0 ? 'Surplus' : 'Defisit'} periode {tahun}</span><span>{formatRupiah(surplus)}</span>
            </div>
          </div>
        )}

        {/* NERACA */}
        {tab === 'neraca' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="font-semibold text-lg mb-4">Aset</h2>
              {aset.map(r => <Row key={r.akun_id} label={`${r.kode_akun} ${r.nama_akun}`} value={Number(r.saldo)} />)}
              <Row label="Total Aset" value={totalAset} bold color="text-blue-700" />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="font-semibold text-lg mb-4">Kewajiban &amp; Ekuitas</h2>
              {kewajiban.map(r => <Row key={r.akun_id} label={`${r.kode_akun} ${r.nama_akun}`} value={Number(r.saldo)} />)}
              {ekuitas.map(r => <Row key={r.akun_id} label={`${r.kode_akun} ${r.nama_akun}`} value={Number(r.saldo)} />)}
              <Row label="Total Kewajiban + Ekuitas"
                value={kewajiban.reduce((s, r) => s + Number(r.saldo), 0) + ekuitas.reduce((s, r) => s + Number(r.saldo), 0)}
                bold color="text-blue-700" />
            </div>
          </div>
        )}

        {/* ARUS KAS */}
        {tab === 'aruskas' && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden max-w-4xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>{['Kas', 'Bulan', 'Kas Masuk', 'Kas Keluar', 'Arus Bersih'].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {arusKas.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">Belum ada mutasi kas</td></tr> :
                  arusKas.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{r.kas_nama}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(r.bulan).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</td>
                      <td className="px-4 py-3 text-green-700">{formatRupiah(r.kas_masuk)}</td>
                      <td className="px-4 py-3 text-red-600">{formatRupiah(r.kas_keluar)}</td>
                      <td className="px-4 py-3 font-semibold">{formatRupiah(r.arus_bersih)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

function aggregateByAkun(rows: any[]) {
  const map: Record<string, any> = {}
  for (const r of rows) {
    if (!map[r.akun_id]) map[r.akun_id] = { ...r, nilai: 0 }
    map[r.akun_id].nilai += Number(r.nilai)
  }
  return Object.values(map).sort((a: any, b: any) => a.kode_akun.localeCompare(b.kode_akun))
}

function Section({ title, rows, color }: { title: string; rows: any[]; color: string }) {
  return (
    <>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-2 mb-1">{title}</p>
      {rows.length === 0 ? <p className="text-sm text-gray-400 py-1">Belum ada data</p> :
        rows.map(r => <Row key={r.akun_id} label={r.nama_akun} value={r.nilai} color={color} />)}
    </>
  )
}

function Row({ label, value, bold, color }: { label: string; value: number; bold?: boolean; color?: string }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm ${bold ? 'border-t border-gray-200 font-bold mt-1 pt-2' : 'text-gray-600'}`}>
      <span>{label}</span><span className={color}>{formatRupiah(value)}</span>
    </div>
  )
}
