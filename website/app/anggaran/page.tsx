'use client'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah } from '@/lib/supabase'
import { exportToExcel } from '@/lib/export-excel'

const BULAN = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const emptyForm = { bulan: String(new Date().getMonth() + 1), kategori_id: '', nama_pos: '', jumlah_dianggarkan: '', keterangan: '' }
const BULAN_OPT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export default function AnggaranPage() {
  const [data, setData] = useState<any[]>([])
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [kategori, setKategori] = useState<any[]>([])
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    // v_anggaran_realisasi: anggaran + realisasi (pengeluaran disetujui) per pos
    const { data: rows } = await supabase.from('v_anggaran_realisasi')
      .select('*').eq('tahun', tahun)
    setData(rows ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [tahun])
  useEffect(() => {
    supabase.from('kategori_pengeluaran').select('id,nama').eq('is_active', true).order('nama')
      .then(({ data }) => setKategori(data ?? []))
  }, [])

  async function addAnggaran() {
    if (!form.nama_pos || !form.jumlah_dianggarkan || Number(form.jumlah_dianggarkan) < 0) { setMsg('Nama pos & jumlah wajib diisi'); return }
    setSaving(true); setMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('anggaran').insert({
      tahun,
      bulan: form.bulan ? Number(form.bulan) : null,
      kategori_id: form.kategori_id || null,
      nama_pos: form.nama_pos,
      jumlah_dianggarkan: Number(form.jumlah_dianggarkan),
      keterangan: form.keterangan || null,
      periode: form.bulan ? 'bulanan' : 'tahunan',
      dibuat_oleh: user?.id ?? null,
    })
    setSaving(false)
    if (error) { setMsg('Gagal: ' + error.message); return }
    setShow(false); setForm({ ...emptyForm }); load()
  }

  const totalAnggaran = data.reduce((s, r) => s + Number(r.jumlah_dianggarkan), 0)
  const totalRealisasi = data.reduce((s, r) => s + Number(r.realisasi), 0)
  const totalSisa = totalAnggaran - totalRealisasi
  const pctTotal = totalAnggaran > 0 ? Math.round((totalRealisasi / totalAnggaran) * 100) : 0

  const grouped: Record<string, any[]> = {}
  for (const r of data) {
    const key = r.kategori ?? 'Umum'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  }

  function handleExport() {
    exportToExcel(
      data.map(r => {
        const sisa = Number(r.jumlah_dianggarkan) - Number(r.realisasi)
        return {
          Kategori: r.kategori ?? 'Umum',
          Pos: r.nama_pos,
          Periode: r.bulan ? BULAN[r.bulan] : 'Tahunan',
          Dianggarkan: Number(r.jumlah_dianggarkan),
          Realisasi: Number(r.realisasi),
          Sisa: sisa,
          'Serapan %': Number(r.jumlah_dianggarkan) > 0 ? Math.round((Number(r.realisasi) / Number(r.jumlah_dianggarkan)) * 100) : 0,
          Status: sisa < 0 ? 'Melebihi anggaran' : 'Dalam anggaran',
        }
      }),
      `anggaran_realisasi_${tahun}`, 'Anggaran'
    )
  }

  return (
    <main className="flex-1 p-8">
        <div className="mb-6 flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Anggaran vs Realisasi</h1>
            <p className="text-gray-500 mt-1">Kontrol pagu pengeluaran terhadap rencana</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleExport} className="border border-gray-300 rounded-xl px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">⬇ Export Excel</button>
            <select value={tahun} onChange={e => setTahun(Number(e.target.value))} className="border rounded-xl px-3 py-1.5 text-sm">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => { setForm({ ...emptyForm }); setMsg(''); setShow(true) }} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl px-4 py-1.5 text-sm font-semibold">+ Tambah</button>
          </div>
        </div>

        {/* Ringkasan total */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-700 text-white rounded-2xl p-5">
            <p className="text-blue-200 text-sm">Total Dianggarkan {tahun}</p>
            <p className="text-2xl font-bold">{formatRupiah(totalAnggaran)}</p>
          </div>
          <div className="bg-white border rounded-2xl p-5">
            <p className="text-gray-500 text-sm">Total Realisasi</p>
            <p className="text-2xl font-bold text-gray-800">{formatRupiah(totalRealisasi)}</p>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${pctTotal > 100 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(pctTotal, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{pctTotal}% terserap</p>
          </div>
          <div className={`rounded-2xl p-5 border ${totalSisa < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className={`text-sm ${totalSisa < 0 ? 'text-red-600' : 'text-green-600'}`}>{totalSisa < 0 ? 'Melebihi anggaran' : 'Sisa anggaran'}</p>
            <p className={`text-2xl font-bold ${totalSisa < 0 ? 'text-red-700' : 'text-green-700'}`}>{formatRupiah(Math.abs(totalSisa))}</p>
          </div>
        </div>

        {loading ? <p className="text-center text-gray-400">Memuat...</p> :
          data.length === 0 ? <div className="bg-white border rounded-2xl p-10 text-center text-gray-400">Belum ada anggaran untuk tahun {tahun}.</div> :
          Object.entries(grouped).map(([kategori, items]) => {
            const subAng = items.reduce((s, r) => s + Number(r.jumlah_dianggarkan), 0)
            const subReal = items.reduce((s, r) => s + Number(r.realisasi), 0)
            return (
              <div key={kategori} className="bg-white rounded-2xl shadow-sm border mb-4 overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700">{kategori}</h3>
                  <p className="text-xs text-gray-500">{formatRupiah(subReal)} / {formatRupiah(subAng)}</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-400 border-b">
                    <tr>
                      <th className="text-left px-5 py-2 font-medium">Pos</th>
                      <th className="text-left px-3 py-2 font-medium">Periode</th>
                      <th className="text-right px-3 py-2 font-medium">Dianggarkan</th>
                      <th className="text-right px-3 py-2 font-medium">Realisasi</th>
                      <th className="text-right px-3 py-2 font-medium">Sisa</th>
                      <th className="px-5 py-2 font-medium w-40">Serapan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map(row => {
                      const ang = Number(row.jumlah_dianggarkan)
                      const real = Number(row.realisasi)
                      const sisa = ang - real
                      const pct = ang > 0 ? Math.round((real / ang) * 100) : 0
                      const over = sisa < 0
                      return (
                        <tr key={row.anggaran_id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium">{row.nama_pos}</td>
                          <td className="px-3 py-3 text-gray-500">{row.bulan ? BULAN[row.bulan] : 'Tahunan'}</td>
                          <td className="px-3 py-3 text-right text-gray-700">{formatRupiah(ang)}</td>
                          <td className="px-3 py-3 text-right text-gray-700">{formatRupiah(real)}</td>
                          <td className={`px-3 py-3 text-right font-semibold ${over ? 'text-red-600' : 'text-green-700'}`}>{over ? `(${formatRupiah(-sisa)})` : formatRupiah(sisa)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${over ? 'bg-red-500' : pct >= 90 ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className={`text-xs font-medium w-10 text-right ${over ? 'text-red-600' : 'text-gray-500'}`}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })
        }
        <p className="text-xs text-gray-400 mt-3">ℹ️ Realisasi dihitung otomatis dari pengeluaran berstatus <b>disetujui</b> pada kategori & periode yang sama. Baris merah = melebihi pagu.</p>

        {show && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShow(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4">Tambah Anggaran {tahun}</h3>
              <div className="space-y-3">
                <label className="text-sm block">Periode bulan
                  <select value={form.bulan} onChange={e => setForm({ ...form, bulan: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1">
                    <option value="">Tahunan (seluruh tahun)</option>
                    {BULAN_OPT.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
                  </select>
                </label>
                <label className="text-sm block">Kategori
                  <select value={form.kategori_id} onChange={e => setForm({ ...form, kategori_id: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1">
                    <option value="">— pilih kategori —</option>
                    {kategori.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </label>
                <label className="text-sm block">Nama pos anggaran
                  <input value={form.nama_pos} onChange={e => setForm({ ...form, nama_pos: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" placeholder="mis. Operasional Bulanan" />
                </label>
                <label className="text-sm block">Jumlah dianggarkan (Rp)
                  <input type="number" value={form.jumlah_dianggarkan} onChange={e => setForm({ ...form, jumlah_dianggarkan: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" placeholder="0" />
                </label>
                <label className="text-sm block">Keterangan (opsional)
                  <input value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </label>
              </div>
              {msg && <p className="text-xs mt-3 text-red-600">{msg}</p>}
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShow(false)} className="flex-1 border rounded-xl py-2 text-sm font-medium">Batal</button>
                <button onClick={addAnggaran} disabled={saving} className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-60">{saving ? 'Menyimpan…' : 'Simpan'}</button>
              </div>
            </div>
          </div>
        )}
    </main>
  )
}
