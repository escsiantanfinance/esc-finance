'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah, formatTanggal, type Pengeluaran } from '@/lib/supabase'
import { exportToExcel } from '@/lib/export-excel'
import { RowAction } from '@/components/RowAction'
import ScopeBanner from '@/components/ScopeBanner'
import { Plus, Download } from 'lucide-react'

const statusBadge: Record<string, string> = {
  pending:   'badge badge-yellow',
  disetujui: 'badge badge-green',
  ditolak:   'badge badge-red',
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
    <main className="flex-1 p-6 lg:p-8">
      <ScopeBanner />
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengeluaran</h1>
          <p className="page-subtitle">Daftar & persetujuan pengeluaran kas</p>
          <div className="flex gap-1.5 flex-wrap mt-3">
            {['semua', 'pending', 'disetujui', 'ditolak'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all capitalize
                  ${filter === s ? 'bg-brand-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-600'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setForm({ ...emptyForm }); setFile(null); setMsg(''); setShow(true) }} className="btn-primary">
            <Plus className="w-4 h-4" /> Tambah Pengeluaran
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="tbl-head">
            <tr>
              {['Tanggal', 'Keterangan', 'Kategori', 'Kas', 'Jumlah', 'Bukti', 'Status', 'Aksi'].map(h => (
                <th key={h} className="tbl-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-5 py-8">
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="h-4 bg-brand-50 rounded-full w-24 animate-pulse" />
                      <div className="h-4 bg-brand-50 rounded-full flex-1 animate-pulse" />
                      <div className="h-4 bg-brand-50 rounded-full w-20 animate-pulse" />
                    </div>
                  ))}
                </div>
              </td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8} className="py-16 text-center text-gray-400 text-sm">Belum ada pengeluaran</td></tr>
            ) : data.map(row => (
              <tr key={row.id} className="tbl-row">
                <td className="tbl-td whitespace-nowrap">{formatTanggal(row.tanggal)}</td>
                <td className="tbl-td max-w-[200px] truncate font-medium text-gray-800">{row.keterangan}</td>
                <td className="tbl-td text-gray-500">{row.kategori?.nama ?? '-'}</td>
                <td className="tbl-td text-gray-500">{row.kas?.nama ?? '-'}</td>
                <td className="tbl-td font-bold text-rose-600">{formatRupiah(row.jumlah)}</td>
                <td className="tbl-td">
                  {(row as any).bukti_url
                    ? <a href={(row as any).bukti_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline text-xs font-medium">📎 Lihat</a>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="tbl-td">
                  <span className={statusBadge[row.status]}>{row.status}</span>
                </td>
                <td className="tbl-td">
                  <div className="flex items-center gap-1.5">
                    {row.status === 'pending' && (
                      <>
                        <RowAction variant="success" onClick={() => approve(row.id)}>✓ Setujui</RowAction>
                        <RowAction variant="danger" onClick={() => reject(row.id)}>✗ Tolak</RowAction>
                      </>
                    )}
                    {row.status === 'disetujui' && (
                      <RowAction variant="danger" onClick={() => cancelApprove(row.id)}>Batalkan</RowAction>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg text-gray-900">Tambah Pengeluaran</h3>
              <p className="text-sm text-gray-400 mt-1">Pengeluaran masuk sebagai <b>pending</b> — perlu disetujui agar memengaruhi saldo.</p>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="form-label">Tanggal</label>
                  <input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} className="form-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="form-label">Metode</label>
                  <select value={form.metode_pembayaran} onChange={e => setForm({ ...form, metode_pembayaran: e.target.value })} className="form-input">
                    <option value="tunai">Tunai</option><option value="transfer">Transfer</option><option value="digital">Digital</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="form-label">Kategori</label>
                  <select value={form.kategori_id} onChange={e => setForm({ ...form, kategori_id: e.target.value })} className="form-input">
                    <option value="">— pilih —</option>
                    {kategori.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="form-label">Kas Asal</label>
                  <select value={form.kas_id} onChange={e => setForm({ ...form, kas_id: e.target.value })} className="form-input">
                    <option value="">— pilih —</option>
                    {kas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="form-label">Jumlah (Rp)</label>
                  <input type="number" value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} className="form-input" placeholder="0" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="form-label">Keterangan</label>
                  <input value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} className="form-input" placeholder="mis. Bayar listrik bulan Juni" />
                </div>
                <div className="space-y-1.5">
                  <label className="form-label">Penerima</label>
                  <input value={form.penerima} onChange={e => setForm({ ...form, penerima: e.target.value })} className="form-input" placeholder="opsional" />
                </div>
                <div className="space-y-1.5">
                  <label className="form-label">Bukti Nota (opsional)</label>
                  <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} className="form-input text-xs py-2" />
                </div>
              </div>
              {msg && <p className="text-xs mt-4 text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">{msg}</p>}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShow(false)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={submit} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
