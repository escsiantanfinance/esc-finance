'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah, type Kas, type Akun } from '@/lib/supabase'
import toast from 'react-hot-toast'
import ScopeBanner from '@/components/ScopeBanner'
import { Plus, Edit2 } from 'lucide-react'

const TIPE_BADGE: Record<string, string> = {
  aset:       'badge badge-blue',
  kewajiban:  'badge badge-yellow',
  ekuitas:    'badge badge-violet',
  pendapatan: 'badge badge-green',
  beban:      'badge badge-red',
}

export default function AkunKasPage() {
  const [kas, setKas] = useState<Kas[]>([])
  const [akun, setAkun] = useState<Akun[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ nama: '', tipe: 'tunai', saldo_awal: '', akun_id: '', nomor_rekening: '', penanggung_jawab: '' })
  const [saving, setSaving] = useState(false)
  const [edit, setEdit] = useState<Kas | null>(null)
  const [editForm, setEditForm] = useState({ nama: '', tipe: 'tunai', nomor_rekening: '', akun_id: '', saldo_awal: '', penanggung_jawab: '', is_aktif: true })
  const [isSuper, setIsSuper] = useState(false)

  async function load() {
    const [{ data: k }, { data: a }] = await Promise.all([
      supabase.from('kas').select('*').order('created_at'),
      supabase.from('akun').select('*').order('kode_akun'),
    ])
    if (k) setKas(k as any)
    if (a) setAkun(a as any)
    setLoading(false)
  }
  useEffect(() => {
    load()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
      setIsSuper(!!p?.is_super_admin)
    })
  }, [])

  async function delKas() {
    if (!edit) return
    if (!confirm(`Hapus kas "${edit.nama}"? Hanya bisa bila tidak punya transaksi. Tindakan permanen.`)) return
    setSaving(true)
    const { error } = await supabase.from('kas').delete().eq('id', edit.id)
    setSaving(false)
    if (error) {
      toast.error(/foreign key|violates|constraint/i.test(error.message)
        ? 'Kas ini masih punya transaksi, tidak bisa dihapus. Nonaktifkan saja.'
        : 'Gagal menghapus: ' + error.message)
      return
    }
    toast.success('Kas berhasil dihapus!')
    setEdit(null); load()
  }

  function openEdit(k: Kas) {
    setEdit(k)
    setEditForm({
      nama: k.nama, tipe: k.tipe, nomor_rekening: k.nomor_rekening ?? '',
      akun_id: k.akun_id ?? '', saldo_awal: String(k.saldo_awal ?? 0),
      penanggung_jawab: k.penanggung_jawab ?? '', is_aktif: k.is_aktif,
    })
  }

  async function saveEdit() {
    if (!edit || !editForm.nama) return
    setSaving(true)
    const newAwal = Number(editForm.saldo_awal || 0)
    const delta = newAwal - Number(edit.saldo_awal ?? 0)
    const { error } = await supabase.from('kas').update({
      nama: editForm.nama,
      tipe: editForm.tipe,
      nomor_rekening: editForm.nomor_rekening || null,
      akun_id: editForm.akun_id || null,
      penanggung_jawab: editForm.penanggung_jawab || null,
      saldo_awal: newAwal,
      saldo_saat_ini: Number(edit.saldo_saat_ini ?? 0) + delta,
      is_aktif: editForm.is_aktif,
    }).eq('id', edit.id)
    setSaving(false)
    if (error) { toast.error('Gagal menyimpan: ' + error.message); return }
    toast.success('Perubahan kas berhasil disimpan!')
    setEdit(null); load()
  }

  const asetAkun = akun.filter(a => a.tipe === 'aset' && !a.is_header)

  async function addKas() {
    if (!form.nama) { toast.error('Nama kas wajib diisi'); return }
    setSaving(true)
    const saldo = Number(form.saldo_awal || 0)
    const { error } = await supabase.from('kas').insert({
      nama: form.nama,
      tipe: form.tipe,
      saldo_awal: saldo,
      saldo_saat_ini: saldo,
      akun_id: form.akun_id || null,
      nomor_rekening: form.nomor_rekening || null,
      penanggung_jawab: form.penanggung_jawab || null,
    })
    setSaving(false)
    if (error) { toast.error('Gagal menambah kas: ' + error.message); return }
    toast.success('Kas baru berhasil ditambahkan!')
    setShowAdd(false)
    setForm({ nama: '', tipe: 'tunai', saldo_awal: '', akun_id: '', nomor_rekening: '', penanggung_jawab: '' })
    load()
  }

  return (
    <main className="flex-1 p-6 lg:p-8">
      <ScopeBanner />
      <div className="page-header">
        <div>
          <h1 className="page-title">Akun &amp; Kas</h1>
          <p className="page-subtitle">Manajemen multi-kas &amp; Bagan Akun (COA)</p>
        </div>
        {isSuper && (
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Tambah Kas
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {kas.map(k => (
          <button key={k.id} onClick={() => openEdit(k)} title="Klik untuk ubah / nonaktifkan"
            className={`text-left card p-5 hover:border-brand-300 hover:shadow-soft transition-all ${!k.is_aktif ? 'opacity-50 grayscale' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-gray-900 text-lg">{k.nama}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="badge badge-gray capitalize">{k.tipe}</span>
                  {!k.is_aktif && <span className="badge badge-red">nonaktif</span>}
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded-xl text-gray-400 group-hover:text-brand-600 transition-colors">
                <Edit2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-brand-600 tracking-tight">{formatRupiah(k.saldo_saat_ini)}</p>
            {k.nomor_rekening && <p className="text-sm font-medium text-gray-500 mt-2">No. {k.nomor_rekening}</p>}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-bold text-gray-900">Bagan Akun (Chart of Accounts)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="tbl-head">
            <tr>{['Kode', 'Nama Akun', 'Tipe', 'Saldo Normal'].map(h => (
              <th key={h} className="tbl-th">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-16 text-center text-gray-400 text-sm">Memuat...</td></tr>
            ) : akun.map(a => (
              <tr key={a.id} className={`tbl-row ${a.is_header ? 'bg-gray-50/80 font-bold' : 'hover:bg-gray-50'}`}>
                <td className={`tbl-td font-mono ${a.is_header ? 'text-gray-900' : 'text-brand-700'}`}>{a.kode_akun}</td>
                <td className={`tbl-td ${a.is_header ? 'text-gray-900' : 'text-gray-700'}`}>{a.nama_akun}</td>
                <td className="tbl-td"><span className={TIPE_BADGE[a.tipe] ?? 'badge badge-gray'}>{a.tipe}</span></td>
                <td className="tbl-td capitalize text-gray-500 font-medium">{a.saldo_normal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg text-gray-900">Tambah Jenis Kas Baru</h3>
            </div>
            <div className="modal-body space-y-4">
              <div className="space-y-1.5">
                <label className="form-label">Nama Kas</label>
                <input placeholder="mis. Kas Pembangunan" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} className="form-input" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Tipe</label>
                <select value={form.tipe} onChange={e => setForm({ ...form, tipe: e.target.value })} className="form-input">
                  <option value="tunai">Tunai</option><option value="bank">Bank</option><option value="digital">Digital</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Saldo Awal</label>
                <input type="number" placeholder="0" value={form.saldo_awal} onChange={e => setForm({ ...form, saldo_awal: e.target.value })} className="form-input" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Penanggung Jawab</label>
                <input placeholder="opsional" value={form.penanggung_jawab} onChange={e => setForm({ ...form, penanggung_jawab: e.target.value })} className="form-input" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Nomor Rekening</label>
                <input placeholder="opsional" value={form.nomor_rekening} onChange={e => setForm({ ...form, nomor_rekening: e.target.value })} className="form-input" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Akun COA (Aset)</label>
                <select value={form.akun_id} onChange={e => setForm({ ...form, akun_id: e.target.value })} className="form-input">
                  <option value="">— pilih akun —</option>
                  {asetAkun.map(a => <option key={a.id} value={a.id}>{a.kode_akun} · {a.nama_akun}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={addKas} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {edit && (
        <div className="modal-overlay" onClick={() => setEdit(null)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg text-gray-900">Ubah Kas</h3>
              <p className="text-sm text-gray-400 mt-1">{edit.nama}</p>
            </div>
            <div className="modal-body space-y-4">
              <div className="space-y-1.5">
                <label className="form-label">Nama Kas</label>
                <input value={editForm.nama} onChange={e => setEditForm({ ...editForm, nama: e.target.value })} className="form-input" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Tipe</label>
                <select value={editForm.tipe} onChange={e => setEditForm({ ...editForm, tipe: e.target.value })} className="form-input">
                  <option value="tunai">Tunai</option><option value="bank">Bank</option><option value="digital">Digital</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Penanggung Jawab</label>
                <input placeholder="opsional" value={editForm.penanggung_jawab} onChange={e => setEditForm({ ...editForm, penanggung_jawab: e.target.value })} className="form-input" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Nomor Rekening</label>
                <input placeholder="opsional" value={editForm.nomor_rekening} onChange={e => setEditForm({ ...editForm, nomor_rekening: e.target.value })} className="form-input" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label flex justify-between">
                  <span>Saldo Awal (Rp)</span>
                  <span className="text-[10px] text-brand-600 font-normal">Geser saldo & Neraca otomatis</span>
                </label>
                <input type="number" value={editForm.saldo_awal} onChange={e => setEditForm({ ...editForm, saldo_awal: e.target.value })} className="form-input" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Akun COA (Aset)</label>
                <select value={editForm.akun_id} onChange={e => setEditForm({ ...editForm, akun_id: e.target.value })} className="form-input">
                  <option value="">— pilih akun —</option>
                  {asetAkun.map(a => <option key={a.id} value={a.id}>{a.kode_akun} · {a.nama_akun}</option>)}
                </select>
              </div>
              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={editForm.is_aktif} onChange={e => setEditForm({ ...editForm, is_aktif: e.target.checked })} className="accent-brand-600 w-4 h-4 rounded" />
                  Kas Aktif
                </label>
              </div>
            </div>
            <div className="modal-footer">
              {isSuper && <button onClick={delKas} disabled={saving} className="btn-danger">🗑 Hapus</button>}
              <button onClick={() => setEdit(null)} className="btn-secondary flex-1 justify-center">{isSuper ? 'Batal' : 'Tutup'}</button>
              {isSuper && <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Menyimpan…' : 'Simpan'}</button>}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
