'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { exportToExcel } from '@/lib/export-excel'
import ImportModal from './ImportModal'

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export default function PerpuluhanPage() {
  const now = new Date()
  const [tahun, setTahun] = useState(now.getFullYear())
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [rows, setRows] = useState<any[]>([])
  const [filter, setFilter] = useState<'semua' | 'sudah' | 'belum'>('semua')
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [form, setForm] = useState({ nama: '', kontak: '', divisi_pelayanan: '', is_volunteer: true })

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('v_status_perpuluhan')
      .select('*').eq('tahun', tahun).eq('bulan', bulan).order('nama')
    setRows(data ?? [])
    setLoading(false)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [tahun, bulan])

  const filtered = rows.filter(r => filter === 'semua' || (filter === 'sudah' ? r.sudah_mengembalikan : !r.sudah_mengembalikan))
  const sudahCount = rows.filter(r => r.sudah_mengembalikan).length
  const pct = rows.length ? Math.round((sudahCount / rows.length) * 100) : 0

  async function addAnggota() {
    if (!form.nama) { alert('Nama wajib diisi'); return }
    const { error } = await supabase.from('anggota').insert({
      nama: form.nama, kontak: form.kontak || null,
      divisi_pelayanan: form.divisi_pelayanan || null, is_volunteer: form.is_volunteer,
    })
    if (error) { alert('Gagal: ' + error.message); return }
    setShow(false); setForm({ nama: '', kontak: '', divisi_pelayanan: '', is_volunteer: true }); load()
  }

  function handleExport() {
    exportToExcel(filtered.map(r => ({
      Nama: r.nama, Divisi: r.divisi_pelayanan ?? '-', Kontak: r.kontak ?? '-',
      Periode: `${BULAN[bulan - 1]} ${tahun}`,
      Status: r.sudah_mengembalikan ? 'Sudah' : 'Belum',
    })), 'status_perpuluhan', 'Perpuluhan')
  }

  return (
    <main className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pelacakan Perpuluhan</h1>
            <p className="text-gray-500 mt-1">Status pengembalian perpuluhan volunteer &amp; jemaat</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={bulan} onChange={e => setBulan(Number(e.target.value))} className="border rounded-xl px-3 py-2 text-sm">
              {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
            </select>
            <select value={tahun} onChange={e => setTahun(Number(e.target.value))} className="border rounded-xl px-3 py-2 text-sm">
              {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleExport} className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">⬇ Export</button>
            <button onClick={() => setShowImport(true)} className="border border-blue-300 text-blue-700 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-50">⬆ Import Excel</button>
            <button onClick={() => setShow(true)} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl px-4 py-2.5 text-sm font-semibold">+ Anggota</button>
          </div>
        </div>

        {/* Ringkasan */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border rounded-2xl p-5"><p className="text-xs text-gray-500">Total wajib perpuluhan</p><p className="text-2xl font-bold text-gray-800">{rows.length}</p></div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5"><p className="text-xs text-green-600">Sudah mengembalikan</p><p className="text-2xl font-bold text-green-700">{sudahCount}</p></div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5"><p className="text-xs text-blue-600">Tingkat ketaatan</p><p className="text-2xl font-bold text-blue-700">{pct}%</p></div>
        </div>

        <div className="flex gap-2 mb-4">
          {(['semua', 'sudah', 'belum'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>{f}</button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>{['Nama', 'Divisi', 'Kontak', 'Status'].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={4} className="text-center py-8 text-gray-400">Memuat...</td></tr> :
                filtered.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-400">Belum ada anggota wajib perpuluhan. Tambahkan anggota dulu.</td></tr> :
                filtered.map(r => (
                  <tr key={r.anggota_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.nama}{r.is_volunteer && <span className="ml-2 text-xs text-blue-600">· volunteer</span>}</td>
                    <td className="px-4 py-3 text-gray-500">{r.divisi_pelayanan ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{r.kontak ?? '-'}</td>
                    <td className="px-4 py-3">
                      {r.sudah_mengembalikan
                        ? <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">✓ Sudah</span>
                        : <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Belum</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">ℹ️ Status otomatis menjadi &quot;Sudah&quot; begitu persembahan berkategori Perpuluhan yang ditautkan ke anggota dicatat pada periode ini.</p>

        {show && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShow(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4">Tambah Anggota / Volunteer</h3>
              <div className="space-y-3">
                <input placeholder="Nama" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                <input placeholder="Kontak (no. HP)" value={form.kontak} onChange={e => setForm({ ...form, kontak: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                <input placeholder="Divisi pelayanan" value={form.divisi_pelayanan} onChange={e => setForm({ ...form, divisi_pelayanan: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={form.is_volunteer} onChange={e => setForm({ ...form, is_volunteer: e.target.checked })} /> Volunteer (relawan pelayanan)</label>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShow(false)} className="flex-1 border rounded-xl py-2 text-sm font-medium">Batal</button>
                <button onClick={addAnggota} className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold">Simpan</button>
              </div>
            </div>
          </div>
        )}

        {showImport && (
          <ImportModal tahun={tahun} bulan={bulan} onClose={() => setShowImport(false)} onImported={load} />
        )}
    </main>
  )
}
