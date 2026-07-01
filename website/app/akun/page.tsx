'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah, type Kas, type Akun } from '@/lib/supabase'
import toast from 'react-hot-toast'
import ScopeBanner from '@/components/ScopeBanner'

const TIPE_BADGE: Record<string, string> = {
  aset: 'bg-blue-100 text-blue-700', kewajiban: 'bg-amber-100 text-amber-700',
  ekuitas: 'bg-violet-100 text-violet-700', pendapatan: 'bg-green-100 text-green-700',
  beban: 'bg-red-100 text-red-700',
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
    // Saldo awal berubah → geser saldo_saat_ini dengan selisih yang sama (anti-drift)
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
    <main className="flex-1 p-8">
        <ScopeBanner />
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Akun &amp; Kas</h1>
            <p className="text-gray-500 mt-1">Manajemen multi-kas &amp; Bagan Akun (COA)</p>
          </div>
          {isSuper && <button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold">+ Tambah Kas</button>}
        </div>

        {/* Kas cards — klik untuk ubah/nonaktifkan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {kas.map(k => (
            <button key={k.id} onClick={() => openEdit(k)} title="Klik untuk ubah / nonaktifkan"
              className={`text-left bg-white rounded-2xl border shadow-soft p-5 hover:border-blue-400 hover:shadow transition-all ${!k.is_aktif ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-800">{k.nama}</p>
                <div className="flex items-center gap-1">
                  {!k.is_aktif && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">nonaktif</span>}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{k.tipe}</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-2">{formatRupiah(k.saldo_saat_ini)}</p>
              {k.nomor_rekening && <p className="text-xs text-gray-400 mt-1">No. {k.nomor_rekening}</p>}
              <p className="text-[11px] text-gray-300 mt-2">✎ ubah</p>
            </button>
          ))}
        </div>

        {/* COA */}
        <div className="bg-white rounded-2xl shadow-soft border overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50"><h2 className="font-semibold text-gray-700">Bagan Akun (Chart of Accounts)</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{['Kode', 'Nama Akun', 'Tipe', 'Saldo Normal'].map(h => <th key={h} className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={4} className="text-center py-8 text-gray-400">Memuat...</td></tr> :
                akun.map(a => (
                  <tr key={a.id} className={a.is_header ? 'bg-gray-50 font-semibold' : 'hover:bg-gray-50'}>
                    <td className="px-5 py-2.5 font-mono text-blue-700">{a.kode_akun}</td>
                    <td className="px-5 py-2.5">{a.nama_akun}</td>
                    <td className="px-5 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TIPE_BADGE[a.tipe]}`}>{a.tipe}</span></td>
                    <td className="px-5 py-2.5 capitalize text-gray-500">{a.saldo_normal}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Modal tambah kas */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowAdd(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4">Tambah Jenis Kas Baru</h3>
              <div className="space-y-3">
                <input placeholder="Nama kas (mis. Kas Pembangunan)" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                <select value={form.tipe} onChange={e => setForm({ ...form, tipe: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm">
                  <option value="tunai">Tunai</option><option value="bank">Bank</option><option value="digital">Digital</option>
                </select>
                <input type="number" placeholder="Saldo awal" value={form.saldo_awal} onChange={e => setForm({ ...form, saldo_awal: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                <input placeholder="Penanggung jawab (Nama MH, opsional)" value={form.penanggung_jawab} onChange={e => setForm({ ...form, penanggung_jawab: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                <input placeholder="Nomor rekening (opsional)" value={form.nomor_rekening} onChange={e => setForm({ ...form, nomor_rekening: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                <select value={form.akun_id} onChange={e => setForm({ ...form, akun_id: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm">
                  <option value="">— Akun COA terkait (Aset) —</option>
                  {asetAkun.map(a => <option key={a.id} value={a.id}>{a.kode_akun} · {a.nama_akun}</option>)}
                </select>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowAdd(false)} className="flex-1 border rounded-xl py-2 text-sm font-medium">Batal</button>
                <button onClick={addKas} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-60">{saving ? 'Menyimpan…' : 'Simpan'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal ubah / nonaktifkan kas */}
        {edit && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setEdit(null)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4">Ubah Kas — {edit.nama}</h3>
              <div className="space-y-3">
                <input placeholder="Nama kas" value={editForm.nama} onChange={e => setEditForm({ ...editForm, nama: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                <select value={editForm.tipe} onChange={e => setEditForm({ ...editForm, tipe: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm">
                  <option value="tunai">Tunai</option><option value="bank">Bank</option><option value="digital">Digital</option>
                </select>
                <input placeholder="Penanggung jawab (Nama MH, opsional)" value={editForm.penanggung_jawab} onChange={e => setEditForm({ ...editForm, penanggung_jawab: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                <input placeholder="Nomor rekening (opsional)" value={editForm.nomor_rekening} onChange={e => setEditForm({ ...editForm, nomor_rekening: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                <label className="text-sm text-gray-600 block">Saldo awal (Rp)
                  <input type="number" value={editForm.saldo_awal} onChange={e => setEditForm({ ...editForm, saldo_awal: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1" />
                  <span className="text-[11px] text-gray-400">Mengubah saldo awal otomatis menggeser saldo saat ini & Neraca.</span>
                </label>
                <select value={editForm.akun_id} onChange={e => setEditForm({ ...editForm, akun_id: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm">
                  <option value="">— Akun COA terkait (Aset) —</option>
                  {asetAkun.map(a => <option key={a.id} value={a.id}>{a.kode_akun} · {a.nama_akun}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={editForm.is_aktif} onChange={e => setEditForm({ ...editForm, is_aktif: e.target.checked })} /> Kas aktif (hilangkan centang untuk menonaktifkan)</label>
              </div>
              <div className="flex gap-2 mt-5">
                {isSuper && <button onClick={delKas} disabled={saving} className="border border-red-300 text-red-600 rounded-xl px-4 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-60">🗑 Hapus</button>}
                <button onClick={() => setEdit(null)} className="flex-1 border rounded-xl py-2 text-sm font-medium">{isSuper ? 'Batal' : 'Tutup'}</button>
                {isSuper && <button onClick={saveEdit} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-60">{saving ? 'Menyimpan…' : 'Simpan perubahan'}</button>}
              </div>
              {isSuper && <p className="text-[11px] text-gray-400 mt-2">Hapus hanya untuk Super Admin & kas tanpa transaksi. Untuk kas berisi data, gunakan nonaktifkan.</p>}
            </div>
          </div>
        )}
    </main>
  )
}
