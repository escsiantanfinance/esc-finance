'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, type KategoriPersembahan, type Kas, type Akun } from '@/lib/supabase'
import { RowAction } from '@/components/RowAction'
import toast from 'react-hot-toast'
import { Plus, Check } from 'lucide-react'

const emptyForm = {
  nama: '', kas_id: '', akun_pendapatan_id: '',
  butuh_nama: false, is_perpuluhan: false, urutan: '0', is_aktif: true,
}

export default function KategoriPersembahanPage() {
  const [list, setList] = useState<KategoriPersembahan[]>([])
  const [kas, setKas] = useState<Kas[]>([])
  const [akun, setAkun] = useState<Akun[]>([])
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [show, setShow] = useState(false)
  const [edit, setEdit] = useState<KategoriPersembahan | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: k }, { data: ks }, { data: a }] = await Promise.all([
      supabase.from('kategori_persembahan').select('*, kas:kas_id(nama)').order('urutan'),
      supabase.from('kas').select('*').eq('is_aktif', true).order('urutan'),
      supabase.from('akun').select('*').eq('tipe', 'pendapatan').eq('is_header', false).order('kode_akun'),
    ])
    if (k) setList(k as any)
    if (ks) setKas(ks as any)
    if (a) setAkun(a as any)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAllowed(false); return }
      const { data: p } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
      setAllowed(!!p?.is_super_admin)
      if (p?.is_super_admin) load()
    })
  }, [])

  function openAdd() { setEdit(null); setForm({ ...emptyForm, urutan: String(list.length + 1) }); setShow(true) }
  function openEdit(k: KategoriPersembahan) {
    setEdit(k)
    setForm({
      nama: k.nama, kas_id: k.kas_id ?? '', akun_pendapatan_id: k.akun_pendapatan_id ?? '',
      butuh_nama: k.butuh_nama, is_perpuluhan: k.is_perpuluhan, urutan: String(k.urutan ?? 0), is_aktif: k.is_aktif,
    })
    setShow(true)
  }

  async function save() {
    if (!form.nama) { alert('Nama kategori wajib diisi'); return }
    setSaving(true)
    const payload = {
      nama: form.nama,
      kas_id: form.kas_id || null,
      akun_pendapatan_id: form.akun_pendapatan_id || null,
      butuh_nama: form.butuh_nama,
      is_perpuluhan: form.is_perpuluhan,
      urutan: Number(form.urutan || 0),
      is_aktif: form.is_aktif,
    }
    const { error } = edit
      ? await supabase.from('kategori_persembahan').update(payload).eq('id', edit.id)
      : await supabase.from('kategori_persembahan').insert(payload)
    setSaving(false)
    if (error) { toast.error('Gagal menyimpan: ' + error.message); return }
    toast.success('Kategori berhasil disimpan!')
    setShow(false); load()
  }

  async function del() {
    if (!edit) return
    if (!confirm(`Hapus kategori "${edit.nama}"? Hanya bisa bila belum dipakai persembahan.`)) return
    setSaving(true)
    const { error } = await supabase.from('kategori_persembahan').delete().eq('id', edit.id)
    setSaving(false)
    if (error) {
      toast.error(/foreign key|violates|constraint/i.test(error.message)
        ? 'Kategori ini sudah dipakai di persembahan, tidak bisa dihapus. Nonaktifkan saja.'
        : 'Gagal menghapus: ' + error.message)
      return
    }
    toast.success('Kategori berhasil dihapus!')
    setShow(false); load()
  }

  if (allowed === null) return <main className="flex-1 p-8 text-gray-400">Memuat…</main>
  if (!allowed) return (
    <main className="flex-1 p-6 lg:p-8">
      <div className="card p-6 max-w-lg border-amber-200 bg-amber-50">
        <h1 className="font-bold text-lg text-amber-800">🔒 Akses dibatasi</h1>
        <p className="text-amber-700 text-sm mt-1">Kategori persembahan hanya bisa diatur Super Admin.</p>
      </div>
    </main>
  )

  return (
    <main className="flex-1 p-6 lg:p-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Kategori Persembahan</h1>
          <p className="page-subtitle">Jenis persembahan yang muncul di aplikasi bendahara</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> Tambah Kategori
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="tbl-head">
            <tr>{['#', 'Nama', 'Kas Tujuan', 'Daftar Nama', 'Perpuluhan', 'Status', ''].map(h => (
              <th key={h} className="tbl-th">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">Memuat…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">Belum ada kategori</td></tr>
            ) : list.map(k => (
              <tr key={k.id} className={`tbl-row ${!k.is_aktif ? 'opacity-50' : ''}`}>
                <td className="tbl-td text-gray-400 w-10">{k.urutan}</td>
                <td className="tbl-td font-semibold text-gray-800">{k.nama}</td>
                <td className="tbl-td text-gray-500">{k.kas?.nama ?? <span className="text-amber-600 text-xs">belum diatur</span>}</td>
                <td className="tbl-td">{k.butuh_nama ? <span className="inline-grid place-items-center w-6 h-6 rounded-full bg-blue-100 text-blue-600"><Check className="w-3.5 h-3.5" strokeWidth={3} /></span> : <span className="text-gray-300 text-xs">—</span>}</td>
                <td className="tbl-td">{k.is_perpuluhan ? <span className="inline-grid place-items-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600"><Check className="w-3.5 h-3.5" strokeWidth={3} /></span> : <span className="text-gray-300 text-xs">—</span>}</td>
                <td className="tbl-td">{k.is_aktif ? <span className="badge badge-green">Aktif</span> : <span className="badge badge-red">Nonaktif</span>}</td>
                <td className="tbl-td text-right"><RowAction onClick={() => openEdit(k)}>Ubah</RowAction></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg text-gray-900">{edit ? 'Ubah Kategori' : 'Tambah Kategori'}</h3>
            </div>
            <div className="modal-body space-y-4">
              <div className="space-y-1.5">
                <label className="form-label">Nama Kategori</label>
                <input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} className="form-input" placeholder="mis. Pembangunan Gedung" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Kas Tujuan</label>
                <select value={form.kas_id} onChange={e => setForm({ ...form, kas_id: e.target.value })} className="form-input">
                  <option value="">— pilih kas —</option>
                  {kas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Akun Pendapatan (untuk jurnal)</label>
                <select value={form.akun_pendapatan_id} onChange={e => setForm({ ...form, akun_pendapatan_id: e.target.value })} className="form-input">
                  <option value="">— pilih akun —</option>
                  {akun.map(a => <option key={a.id} value={a.id}>{a.kode_akun} · {a.nama_akun}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="form-label">Urutan</label>
                  <input type="number" value={form.urutan} onChange={e => setForm({ ...form, urutan: e.target.value })} className="form-input" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="is_aktif" checked={form.is_aktif} onChange={e => setForm({ ...form, is_aktif: e.target.checked })} className="accent-brand-600" />
                  <label htmlFor="is_aktif" className="text-sm font-medium text-gray-700">Aktif</label>
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.butuh_nama} onChange={e => setForm({ ...form, butuh_nama: e.target.checked })} className="accent-brand-600" />
                  Kumpulkan daftar nama pemberi
                </label>
                <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.is_perpuluhan} onChange={e => setForm({ ...form, is_perpuluhan: e.target.checked })} className="accent-brand-600" />
                  Dihitung sebagai perpuluhan
                </label>
              </div>
            </div>
            <div className="modal-footer">
              {edit && <button onClick={del} disabled={saving} className="btn-danger">🗑 Hapus</button>}
              <button onClick={() => setShow(false)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
