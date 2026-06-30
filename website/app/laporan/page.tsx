'use client'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah } from '@/lib/supabase'
import { exportSheets } from '@/lib/export-excel'

type Tab = 'aktivitas' | 'neraca' | 'aruskas'

function pad(n: number) { return String(n).padStart(2, '0') }
function toISO(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function startOfWeek(d: Date) {
  const day = d.getDay() || 7 // Senin = awal minggu
  const r = new Date(d)
  r.setDate(d.getDate() - day + 1)
  return r
}
function fmtTgl(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function presetRange(key: string): { from: string; to: string } {
  const now = new Date()
  if (key === 'minggu_ini') {
    const s = startOfWeek(now); const e = new Date(s); e.setDate(s.getDate() + 6)
    return { from: toISO(s), to: toISO(e) }
  }
  if (key === 'minggu_lalu') {
    const s = startOfWeek(now); s.setDate(s.getDate() - 7); const e = new Date(s); e.setDate(s.getDate() + 6)
    return { from: toISO(s), to: toISO(e) }
  }
  if (key === 'bulan_ini') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1)
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from: toISO(s), to: toISO(e) }
  }
  if (key === 'bulan_lalu') {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const e = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: toISO(s), to: toISO(e) }
  }
  // tahun_ini
  return { from: toISO(new Date(now.getFullYear(), 0, 1)), to: toISO(new Date(now.getFullYear(), 11, 31)) }
}

const PRESETS = [
  ['minggu_ini', 'Minggu ini'], ['minggu_lalu', 'Minggu lalu'],
  ['bulan_ini', 'Bulan ini'], ['bulan_lalu', 'Bulan lalu'], ['tahun_ini', 'Tahun ini'],
] as const

export default function LaporanPage() {
  const [tab, setTab] = useState<Tab>('aktivitas')
  const init = presetRange('bulan_ini')
  const [dateFrom, setDateFrom] = useState(init.from)
  const [dateTo, setDateTo] = useState(init.to)
  const [activePreset, setActivePreset] = useState('bulan_ini')
  const [loading, setLoading] = useState(true)

  const [aktivitasAgg, setAktivitasAgg] = useState<any[]>([])
  const [arusKasAgg, setArusKasAgg] = useState<any[]>([])
  const [neraca, setNeraca] = useState<any[]>([])
  const [kasByAkunId, setKasByAkunId] = useState<Record<string, { id: string; nama: string }>>({})

  // Kas → akun_id, dimuat sekali (dipakai memetakan baris jurnal ke kas utk Arus Kas)
  useEffect(() => {
    async function loadKas() {
      const { data } = await supabase.from('kas').select('id, nama, akun_id').eq('is_aktif', true)
      const map: Record<string, { id: string; nama: string }> = {}
      for (const k of data ?? []) if (k.akun_id) map[k.akun_id] = { id: k.id, nama: k.nama }
      setKasByAkunId(map)
    }
    loadKas()
  }, [])

  // Neraca = saldo saat ini (point-in-time), tidak terikat rentang tanggal
  useEffect(() => {
    supabase.from('v_neraca').select('*').then(({ data }) => setNeraca(data ?? []))
  }, [])

  // Aktivitas & Arus Kas dihitung langsung dari jurnal sesuai rentang tanggal terpilih
  useEffect(() => {
    if (Object.keys(kasByAkunId).length === 0 && tab !== 'neraca') {
      // tunggu peta kas siap dulu di load pertama
    }
    loadPeriode(dateFrom, dateTo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, kasByAkunId])

  async function loadPeriode(from: string, to: string) {
    setLoading(true)
    const { data: jRows } = await supabase.from('jurnal_umum').select('id').gte('tanggal', from).lte('tanggal', to)
    const ids = (jRows ?? []).map((j: any) => j.id)
    if (ids.length === 0) { setAktivitasAgg([]); setArusKasAgg([]); setLoading(false); return }
    const { data: details } = await supabase.from('jurnal_umum_detail')
      .select('debit, kredit, akun:akun_id(id,kode_akun,nama_akun,tipe)')
      .in('jurnal_id', ids)

    const aktAgg: Record<string, any> = {}
    const kasAgg: Record<string, any> = {}
    for (const d of (details ?? []) as any[]) {
      const akun = d.akun
      if (!akun) continue
      const debit = Number(d.debit), kredit = Number(d.kredit)
      if (akun.tipe === 'pendapatan' || akun.tipe === 'beban') {
        const nilai = akun.tipe === 'pendapatan' ? (kredit - debit) : (debit - kredit)
        aktAgg[akun.id] ??= { akun_id: akun.id, kode_akun: akun.kode_akun, nama_akun: akun.nama_akun, tipe: akun.tipe, nilai: 0 }
        aktAgg[akun.id].nilai += nilai
      }
      const kasMatch = kasByAkunId[akun.id]
      if (kasMatch) {
        kasAgg[kasMatch.id] ??= { kas_id: kasMatch.id, kas_nama: kasMatch.nama, masuk: 0, keluar: 0 }
        kasAgg[kasMatch.id].masuk += debit
        kasAgg[kasMatch.id].keluar += kredit
      }
    }
    setAktivitasAgg(Object.values(aktAgg).sort((a: any, b: any) => a.kode_akun.localeCompare(b.kode_akun)))
    setArusKasAgg(Object.values(kasAgg).sort((a: any, b: any) => a.kas_nama.localeCompare(b.kas_nama)))
    setLoading(false)
  }

  function applyPreset(key: string) {
    const r = presetRange(key)
    setActivePreset(key); setDateFrom(r.from); setDateTo(r.to)
  }

  const pendapatan = aktivitasAgg.filter(r => r.tipe === 'pendapatan')
  const beban = aktivitasAgg.filter(r => r.tipe === 'beban')
  const totalPendapatan = pendapatan.reduce((s, r) => s + r.nilai, 0)
  const totalBeban = beban.reduce((s, r) => s + r.nilai, 0)
  const surplus = totalPendapatan - totalBeban

  const totalMasuk = arusKasAgg.reduce((s, r) => s + r.masuk, 0)
  const totalKeluar = arusKasAgg.reduce((s, r) => s + r.keluar, 0)

  const aset = neraca.filter(r => r.tipe === 'aset')
  const kewajiban = neraca.filter(r => r.tipe === 'kewajiban')
  const ekuitas = neraca.filter(r => r.tipe === 'ekuitas')
  const totalAset = aset.reduce((s, r) => s + Number(r.saldo), 0)
  const totalKewajibanEkuitas = kewajiban.reduce((s, r) => s + Number(r.saldo), 0) + ekuitas.reduce((s, r) => s + Number(r.saldo), 0)
  const neracaSeimbang = Math.abs(totalAset - totalKewajibanEkuitas) < 1

  function handleExport() {
    const periode = `${dateFrom}_sd_${dateTo}`
    exportSheets([
      { name: 'Laporan Aktivitas', rows: aktivitasAgg.map(r => ({ Kode: r.kode_akun, Akun: r.nama_akun, Tipe: r.tipe, Nilai: r.nilai, Periode: `${fmtTgl(dateFrom)} - ${fmtTgl(dateTo)}` })) },
      { name: 'Neraca', rows: neraca.map(r => ({ Kode: r.kode_akun, Akun: r.nama_akun, Tipe: r.tipe, Saldo: r.saldo, Keterangan: 'Saldo saat ini' })) },
      { name: 'Arus Kas', rows: arusKasAgg.map(r => ({ Kas: r.kas_nama, Masuk: r.masuk, Keluar: r.keluar, Bersih: r.masuk - r.keluar, Periode: `${fmtTgl(dateFrom)} - ${fmtTgl(dateTo)}` })) },
    ], `laporan_keuangan_${periode}`)
  }

  return (
    <main className="flex-1 p-8">
        <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Laporan Keuangan</h1>
            <p className="text-gray-500 mt-1">3 laporan standar akuntansi nirlaba</p>
          </div>
          <button onClick={handleExport} className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">⬇ Export Excel</button>
        </div>

        <div className="flex gap-2 mb-5">
          {([['aktivitas', '📈 Laporan Aktivitas'], ['neraca', '⚖️ Neraca'], ['aruskas', '💧 Arus Kas']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === k ? 'bg-blue-700 text-white' : 'bg-white border text-gray-600'}`}>{l}</button>
          ))}
        </div>

        {/* Filter rentang tanggal — berlaku utk Aktivitas & Arus Kas (laporan arus/periode). Neraca = saldo saat ini. */}
        {tab !== 'neraca' ? (
          <div className="bg-white border rounded-2xl p-4 mb-5 flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5 flex-wrap">
              {PRESETS.map(([k, l]) => (
                <button key={k} onClick={() => applyPreset(k)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activePreset === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="h-5 w-px bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-2 text-sm">
              <label className="text-gray-500 text-xs">Dari</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setActivePreset('') }} className="border rounded-lg px-2 py-1.5 text-sm" />
              <label className="text-gray-500 text-xs">Sampai</label>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setActivePreset('') }} className="border rounded-lg px-2 py-1.5 text-sm" />
            </div>
            <span className="text-xs text-gray-400 ml-auto">{fmtTgl(dateFrom)} — {fmtTgl(dateTo)}</span>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 text-sm text-blue-700">
            ℹ️ Neraca menampilkan <b>saldo saat ini</b> (real-time) — bukan laporan per periode, sehingga tidak difilter per tanggal/minggu.
          </div>
        )}

        {/* AKTIVITAS */}
        {tab === 'aktivitas' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-3xl">
            <h2 className="font-semibold text-lg mb-4">Laporan Aktivitas — {fmtTgl(dateFrom)} s/d {fmtTgl(dateTo)}</h2>
            {loading ? <p className="text-sm text-gray-400 py-4">Memuat...</p> : <>
              <Section title="Pendapatan" rows={pendapatan} color="text-green-700" />
              <Row label="Total Pendapatan" value={totalPendapatan} bold color="text-green-700" />
              <div className="h-4" />
              <Section title="Beban" rows={beban} color="text-red-600" />
              <Row label="Total Beban" value={totalBeban} bold color="text-red-600" />
              <div className={`flex justify-between mt-5 p-4 rounded-xl font-bold ${surplus >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <span>{surplus >= 0 ? 'Surplus' : 'Defisit'} periode ini</span><span>{formatRupiah(surplus)}</span>
              </div>
            </>}
          </div>
        )}

        {/* NERACA */}
        {tab === 'neraca' && (
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h2 className="font-semibold text-lg mb-4">Aset</h2>
                {aset.map(r => <Row key={r.akun_id} label={`${r.kode_akun} ${r.nama_akun}`} value={Number(r.saldo)} />)}
                <Row label="Total Aset" value={totalAset} bold color="text-blue-700" />
              </div>
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h2 className="font-semibold text-lg mb-4">Kewajiban &amp; Ekuitas</h2>
                {kewajiban.map(r => <Row key={r.akun_id} label={`${r.kode_akun} ${r.nama_akun}`} value={Number(r.saldo)} />)}
                {ekuitas.map(r => <Row key={r.akun_id} label={`${r.kode_akun} ${r.nama_akun}`} value={Number(r.saldo)} />)}
                <Row label="Total Kewajiban + Ekuitas" value={totalKewajibanEkuitas} bold color="text-blue-700" />
              </div>
            </div>
            <div className={`mt-4 flex items-center justify-between rounded-xl px-5 py-3 text-sm font-semibold ${neracaSeimbang ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              <span>{neracaSeimbang ? '✓ Neraca seimbang (Aset = Kewajiban + Ekuitas)' : '✗ Neraca tidak seimbang — periksa jurnal'}</span>
              {!neracaSeimbang && <span>Selisih {formatRupiah(totalAset - totalKewajibanEkuitas)}</span>}
            </div>
          </div>
        )}

        {/* ARUS KAS */}
        {tab === 'aruskas' && (
          <div className="max-w-4xl">
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr>{['Kas', 'Kas Masuk', 'Kas Keluar', 'Arus Bersih'].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? <tr><td colSpan={4} className="text-center py-8 text-gray-400">Memuat...</td></tr> :
                    arusKasAgg.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-400">Tidak ada mutasi kas pada periode ini</td></tr> :
                    arusKasAgg.map((r) => (
                      <tr key={r.kas_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{r.kas_nama}</td>
                        <td className="px-4 py-3 text-green-700">{formatRupiah(r.masuk)}</td>
                        <td className="px-4 py-3 text-red-600">{formatRupiah(r.keluar)}</td>
                        <td className="px-4 py-3 font-semibold">{formatRupiah(r.masuk - r.keluar)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between rounded-xl px-5 py-3 text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span>Total semua kas — {fmtTgl(dateFrom)} s/d {fmtTgl(dateTo)}</span>
              <span>Masuk {formatRupiah(totalMasuk)} · Keluar {formatRupiah(totalKeluar)} · Bersih {formatRupiah(totalMasuk - totalKeluar)}</span>
            </div>
          </div>
        )}
    </main>
  )
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
