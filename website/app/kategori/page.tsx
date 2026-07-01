'use client'
import { useEffect, useState } from 'react'
import { supabase, type KategoriPersembahan, type Kas, type Akun } from '@/lib/supabase'
import { RowAction } from '@/components/RowAction'
import toast from 'react-hot-toast'

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
        ? 'Kategori ini sudah dipakai di persembahan, jadi tidak bisa dihapus. Nonaktifkan saja (hilangkan centang "Aktif").'
        : 'Gagal menghapus: ' + error.message)
      return
    }
    toast.success('Kategori berhasil dihapus!')
    setShow(false); load()
  }

  if (allowed === null) return <main className="flex-1 p-8 text-gray-400">Memuat…</main>
  if (!allowed) return (
    <main className="flex-1 p-8"><div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-lg">
      <h1 className="font-bold text-lg text-amber-800">🔒 Akses dibatasi</h1>
      <p className="text-amber-700 text-sm mt-1">Kategori persembahan hanya bisa diatur Super Admin.</p>
    </div></main>
  )

  return (
    <main className="flex-1 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kategori Persembahan</h1>
          <p className="text-gray-500 mt-1">Jenis persembahan yang muncul di aplikasi bendahara — tiap kategori menuju satu kas</p>
        </div>
        <button onClick={openAdd} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl px-4 py-2.5 text-sm font-semibold">+ Tambah Kategori</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['#', 'Nama', 'Kas tujuan', 'Daftar nama', 'Perpuluhan', 'Status', ''].map(h => <th key={h} className="text-left px-5 py-3 font-semibold text-gray-600">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Memuat…</td></tr> :
              list.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada kategori</td></tr> :
              list.map(k => (
                <tr key={k.id} className={`hover:bg-gray-50 ${!k.is_aktif ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3 text-gray-400">{k.urutan}</td>
                  <td className="px-5 py-3 font-medium">{k.nama}</td>
                  <td className="px-5 py-3 text-gray-500">{k.kas?.nama ?? <span className="text-amber-600">belum diatur</span>}</td>
                  <td className="px-5 py-3">{k.butuh_nama ? <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">ya</span> : <span className="text-gray-300 text-xs">tidak</span>}</td>
                  <td className="px-5 py-3">{k.is_perpuluhan ? <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">ya</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                  <td className="px-5 py-3">{k.is_aktif ? <span className="text-xs text-green-600">aktif</span> : <span className="text-xs text-red-500">nonaktif</span>}</td>
                  <td className="px-5 py-3 text-right"><RowAction onClick={() => openEdit(k)}>Ubah</RowAction></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShow(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{edit ? 'Ubah Kategori' : 'Tambah Kategori'}</h3>
            <div className="space-y-3">
              <label className="text-sm block">Nama kategori
                <input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" placeholder="mis. Pembangunan Gedung" />
              </label>
              <label className="text-sm block">Kas tujuan
                <select value={form.kas_id} onChange={e => setForm({ ...form, kas_id: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1">
                  <option value="">— pilih kas —</option>
                  {kas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </label>
              <label className="text-sm block">Akun pendapatan (untuk jurnal)
                <select value={form.akun_pendapatan_id} onChange={e => setForm({ ...form, akun_pendapatan_id: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1">
                  <option value="">— pilih akun —</option>
                  {akun.map(a => <option key={a.id} value={a.id}>{a.kode_akun} · {a.nama_akun}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Urutan
                  <input type="number" value={form.urutan} onChange={e => setForm({ ...form, urutan: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                </label>
                <label className="flex items-center gap-2 text-sm pt-6">
                  <input type="checkbox" checked={form.is_aktif} onChange={e => setForm({ ...form, is_aktif: e.target.checked })} /> Aktif
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.butuh_nama} onChange={e => setForm({ ...form, butuh_nama: e.target.checked })} /> Kumpulkan daftar nama pemberi
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_perpuluhan} onChange={e => setForm({ ...form, is_perpuluhan: e.target.checked })} /> Dihitung sebagai perpuluhan (untuk laporan status)
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              {edit && <button onClick={del} disabled={saving} className="border border-red-300 text-red-600 rounded-xl px-4 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-60">🗑 Hapus</button>}
              <button onClick={() => setShow(false)} className="flex-1 border rounded-xl py-2 text-sm font-medium">Batal</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-60">{saving ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
