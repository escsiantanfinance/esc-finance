'use client'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah, type Kas, type Akun } from '@/lib/supabase'

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
  const [form, setForm] = useState({ nama: '', tipe: 'tunai', saldo_awal: '', akun_id: '', nomor_rekening: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: k }, { data: a }] = await Promise.all([
      supabase.from('kas').select('*').order('created_at'),
      supabase.from('akun').select('*').order('kode_akun'),
    ])
    if (k) setKas(k as any)
    if (a) setAkun(a as any)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const asetAkun = akun.filter(a => a.tipe === 'aset' && !a.is_header)

  async function addKas() {
    if (!form.nama) { alert('Nama kas wajib diisi'); return }
    setSaving(true)
    const saldo = Number(form.saldo_awal || 0)
    const { error } = await supabase.from('kas').insert({
      nama: form.nama,
      tipe: form.tipe,
      saldo_awal: saldo,
      saldo_saat_ini: saldo,
      akun_id: form.akun_id || null,
      nomor_rekening: form.nomor_rekening || null,
    })
    setSaving(false)
    if (error) { alert('Gagal menambah kas: ' + error.message); return }
    setShowAdd(false)
    setForm({ nama: '', tipe: 'tunai', saldo_awal: '', akun_id: '', nomor_rekening: '' })
    load()
  }

  return (
    <main className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Akun &amp; Kas</h1>
            <p className="text-gray-500 mt-1">Manajemen multi-kas &amp; Bagan Akun (COA)</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl px-4 py-2.5 text-sm font-semibold">+ Tambah Kas</button>
        </div>

        {/* Kas cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {kas.map(k => (
            <div key={k.id} className="bg-white rounded-2xl border shadow-sm p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-800">{k.nama}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{k.tipe}</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-2">{formatRupiah(k.saldo_saat_ini)}</p>
              {k.nomor_rekening && <p className="text-xs text-gray-400 mt-1">No. {k.nomor_rekening}</p>}
            </div>
          ))}
        </div>

        {/* COA */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50"><h2 className="font-semibold text-gray-700">Bagan Akun (Chart of Accounts)</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-white border-b">
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
                <input placeholder="Nomor rekening (opsional)" value={form.nomor_rekening} onChange={e => setForm({ ...form, nomor_rekening: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                <select value={form.akun_id} onChange={e => setForm({ ...form, akun_id: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm">
                  <option value="">— Akun COA terkait (Aset) —</option>
                  {asetAkun.map(a => <option key={a.id} value={a.id}>{a.kode_akun} · {a.nama_akun}</option>)}
                </select>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowAdd(false)} className="flex-1 border rounded-xl py-2 text-sm font-medium">Batal</button>
                <button onClick={addKas} disabled={saving} className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-60">{saving ? 'Menyimpan…' : 'Simpan'}</button>
              </div>
            </div>
          </div>
        )}
    </main>
  )
}
