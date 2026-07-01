'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah, formatTanggal, type Pengeluaran } from '@/lib/supabase'
import { exportToExcel } from '@/lib/export-excel'
import { RowAction, RowActions } from '@/components/RowAction'
import ScopeBanner from '@/components/ScopeBanner'

const statusStyle: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  disetujui: 'bg-green-100 text-green-700',
  ditolak: 'bg-red-100 text-red-700',
}

const emptyForm = {
  tanggal: new Date().toISOString().slice(0, 10),
  kategori_id: '', kas_id: '', jumlah: '', keterangan: '', penerima: '',
  metode_pembayaran: 'tunai',
}

export default function PengeluaranPage() {
  const [data, setData] = useState<Pengeluaran[]>([])
  const [filter, setFilter] = useState<string>('semua')
  const [loading, setLoading] = useState(true)
  const [kategori, setKategori] = useState<any[]>([])
  const [kas, setKas] = useState<any[]>([])
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    let query = supabase.from('pengeluaran')
      .select('*, kategori:kategori_id(nama,warna), kas:kas_id(nama)')
      .order('tanggal', { ascending: false })
    if (filter !== 'semua') query = query.eq('status', filter)
    const { data: rows } = await query
    if (rows) setData(rows as any)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [filter])
  useEffect(() => {
    async function refs() {
      const [{ data: k }, { data: ks }] = await Promise.all([
        supabase.from('kategori_pengeluaran').select('id,nama').eq('is_active', true).order('nama'),
        supabase.from('kas').select('id,nama').eq('is_aktif', true).order('nama'),
      ])
      setKategori(k ?? []); setKas(ks ?? [])
    }
    refs()
  }, [])

  async function submit() {
    if (!form.keterangan || !form.jumlah || Number(form.jumlah) <= 0) { setMsg('Keterangan & jumlah (>0) wajib diisi'); return }
    setSaving(true); setMsg('')
    let bukti_url: string | null = null
    if (file) {
      const path = `${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`
      const { error: upErr } = await supabase.storage.from('bukti').upload(path, file)
      if (upErr) {
        setMsg(`⚠️ Pengeluaran disimpan, tapi bukti gagal diunggah (buat bucket "bukti" di Supabase Storage dulu). ${upErr.message}`)
      } else {
        bukti_url = supabase.storage.from('bukti').getPublicUrl(path).data.publicUrl
      }
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('pengeluaran').insert({
      tanggal: form.tanggal,
      kategori_id: form.kategori_id || null,
      kas_id: form.kas_id || null,
      jumlah: Number(form.jumlah),
      keterangan: form.keterangan,
      penerima: form.penerima || null,
      metode_pembayaran: form.metode_pembayaran,
      bukti_url,
      status: 'pending',
      diajukan_oleh: user?.id ?? null,
    })
    setSaving(false)
    if (error) { setMsg('Gagal: ' + error.message); return }
    setShow(false); setForm({ ...emptyForm }); setFile(null)
    if (!bukti_url && file) { /* keep msg */ } else setMsg('')
    load()
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

  async function cancelApprove(id: string) {
    if (!confirm('Batalkan persetujuan pengeluaran ini dan kembalikan ke status pending?')) return
    const { error } = await supabase.from('pengeluaran').update({ status: 'pending', disetujui_oleh: null }).eq('id', id)
    if (error) alert('Gagal: ' + error.message)
    else load()
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

  return (
    <main className="flex-1 p-8">
        <ScopeBanner />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pengeluaran</h1>
            <div className="flex gap-2 mt-4 flex-wrap">
              {['semua', 'pending', 'disetujui', 'ditolak'].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize
                    ${filter === s ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="border border-gray-300 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">⬇ Export Excel</button>
            <button onClick={() => { setForm({ ...emptyForm }); setFile(null); setMsg(''); setShow(true) }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold">+ Tambah Pengeluaran</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Tanggal', 'Keterangan', 'Kategori', 'Kas', 'Jumlah', 'Bukti', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-4">
                    <div className="space-y-4">
                      {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />)}
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Belum ada pengeluaran</td></tr>
              ) : data.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">{formatTanggal(row.tanggal)}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{row.keterangan}</td>
                  <td className="px-4 py-3 text-gray-500">{row.kategori?.nama ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{row.kas?.nama ?? '-'}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{formatRupiah(row.jumlah)}</td>
                  <td className="px-4 py-3">{(row as any).bukti_url ? <a href={(row as any).bukti_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">📎 Lihat</a> : <span className="text-gray-300 text-xs">-</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle[row.status]}`}>{row.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {row.status === 'pending' && (
                      <RowActions>
                        <RowAction variant="success" onClick={() => approve(row.id)}>✓ Setujui</RowAction>
                        <RowAction variant="danger" onClick={() => reject(row.id)}>✗ Tolak</RowAction>
                      </RowActions>
                    )}
                    {row.status === 'disetujui' && (
                      <RowActions>
                        <RowAction variant="danger" onClick={() => cancelApprove(row.id)}>Batalkan</RowAction>
                      </RowActions>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {show && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShow(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4">Tambah Pengeluaran</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Tanggal
                  <input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </label>
                <label className="text-sm">Metode
                  <select value={form.metode_pembayaran} onChange={e => setForm({ ...form, metode_pembayaran: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1">
                    <option value="tunai">Tunai</option><option value="transfer">Transfer</option><option value="digital">Digital</option>
                  </select>
                </label>
                <label className="text-sm">Kategori
                  <select value={form.kategori_id} onChange={e => setForm({ ...form, kategori_id: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1">
                    <option value="">— pilih —</option>
                    {kategori.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </label>
                <label className="text-sm">Kas asal
                  <select value={form.kas_id} onChange={e => setForm({ ...form, kas_id: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1">
                    <option value="">— pilih —</option>
                    {kas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </label>
                <label className="text-sm col-span-2">Jumlah (Rp)
                  <input type="number" value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" placeholder="0" />
                </label>
                <label className="text-sm col-span-2">Keterangan
                  <input value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" placeholder="mis. Bayar listrik bulan Juni" />
                </label>
                <label className="text-sm">Penerima
                  <input value={form.penerima} onChange={e => setForm({ ...form, penerima: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" placeholder="opsional" />
                </label>
                <label className="text-sm">Bukti nota (opsional)
                  <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} className="w-full text-xs mt-2" />
                </label>
              </div>
              {msg && <p className="text-xs mt-3 text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{msg}</p>}
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShow(false)} className="flex-1 border rounded-xl py-2 text-sm font-medium">Batal</button>
                <button onClick={submit} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-60">{saving ? 'Menyimpan…' : 'Simpan (status: pending)'}</button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Pengeluaran masuk sebagai <b>pending</b> → perlu disetujui agar memengaruhi saldo kas & jurnal.</p>
            </div>
          </div>
        )}
    </main>
  )
}
