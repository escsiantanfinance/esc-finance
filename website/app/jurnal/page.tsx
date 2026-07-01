'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah, formatTanggal, type Akun } from '@/lib/supabase'

type Line = { akun_id: string; debit: string; kredit: string }
const SUMBER_BADGE: Record<string, string> = {
  persembahan: 'bg-green-100 text-green-700', pengeluaran: 'bg-blue-100 text-blue-700', manual: 'bg-gray-100 text-gray-600',
}

export default function JurnalPage() {
  const [jurnal, setJurnal] = useState<any[]>([])
  const [akun, setAkun] = useState<Akun[]>([])
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false)
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10))
  const [keterangan, setKeterangan] = useState('')
  const [lines, setLines] = useState<Line[]>([{ akun_id: '', debit: '', kredit: '' }, { akun_id: '', debit: '', kredit: '' }])
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: j }, { data: a }] = await Promise.all([
      supabase.from('jurnal_umum').select('*, detail:jurnal_umum_detail(debit,kredit,akun:akun_id(kode_akun,nama_akun))').order('tanggal', { ascending: false }).limit(40),
      supabase.from('akun').select('*').eq('is_header', false).order('kode_akun'),
    ])
    if (j) setJurnal(j)
    if (a) setAkun(a as any)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
  const totalKredit = lines.reduce((s, l) => s + Number(l.kredit || 0), 0)
  const balanced = totalDebit > 0 && totalDebit === totalKredit

  function setLine(i: number, patch: Partial<Line>) {
    setLines(lines.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }

  async function save() {
    if (!balanced) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: head, error } = await supabase.from('jurnal_umum')
      .insert({ tanggal, keterangan, sumber: 'manual', dicatat_oleh: user?.id ?? null })
      .select('id').single()
    if (error || !head) { setSaving(false); alert('Gagal: ' + error?.message); return }
    const detailRows = lines.filter(l => l.akun_id && (Number(l.debit) || Number(l.kredit)))
      .map(l => ({ jurnal_id: head.id, akun_id: l.akun_id, debit: Number(l.debit || 0), kredit: Number(l.kredit || 0) }))
    await supabase.from('jurnal_umum_detail').insert(detailRows)
    setSaving(false); setShow(false)
    setLines([{ akun_id: '', debit: '', kredit: '' }, { akun_id: '', debit: '', kredit: '' }]); setKeterangan('')
    load()
  }

  return (
    <main className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Jurnal Umum</h1>
            <p className="text-gray-500 mt-1">Pencatatan transaksi &amp; penyesuaian manual (double-entry)</p>
          </div>
          <button onClick={() => setShow(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold">+ Jurnal Baru</button>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>{['Tanggal', 'Keterangan', 'Akun (Debit / Kredit)', 'Sumber', 'Nilai'].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">Memuat...</td></tr> :
                jurnal.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">Belum ada jurnal</td></tr> :
                jurnal.map(j => {
                  const nilai = (j.detail ?? []).reduce((s: number, d: any) => s + Number(d.debit), 0)
                  return (
                    <tr key={j.id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3 whitespace-nowrap">{formatTanggal(j.tanggal)}</td>
                      <td className="px-4 py-3 max-w-[220px]">{j.keterangan}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {(j.detail ?? []).map((d: any, i: number) => (
                          <div key={i}>{d.akun?.kode_akun} {d.akun?.nama_akun} — {Number(d.debit) > 0 ? `D ${formatRupiah(d.debit)}` : `K ${formatRupiah(d.kredit)}`}</div>
                        ))}
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${SUMBER_BADGE[j.sumber]}`}>{j.sumber}</span></td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatRupiah(nilai)}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        {show && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShow(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4">Jurnal Baru</h3>
              <div className="flex gap-3 mb-3">
                <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" />
                <input placeholder="Keterangan" value={keterangan} onChange={e => setKeterangan(e.target.value)} className="flex-1 border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <select value={l.akun_id} onChange={e => setLine(i, { akun_id: e.target.value })} className="flex-1 border rounded-lg px-2 py-2 text-xs">
                      <option value="">— Pilih akun —</option>
                      {akun.map(a => <option key={a.id} value={a.id}>{a.kode_akun} · {a.nama_akun}</option>)}
                    </select>
                    <input type="number" placeholder="Debit" value={l.debit} onChange={e => setLine(i, { debit: e.target.value, kredit: '' })} className="w-28 border rounded-lg px-2 py-2 text-xs" />
                    <input type="number" placeholder="Kredit" value={l.kredit} onChange={e => setLine(i, { kredit: e.target.value, debit: '' })} className="w-28 border rounded-lg px-2 py-2 text-xs" />
                  </div>
                ))}
              </div>
              <button onClick={() => setLines([...lines, { akun_id: '', debit: '', kredit: '' }])} className="text-blue-700 text-xs font-medium mt-2">+ Tambah baris</button>
              <div className={`flex justify-between text-sm mt-3 px-1 font-semibold ${balanced ? 'text-green-600' : 'text-red-600'}`}>
                <span>Total Debit: {formatRupiah(totalDebit)} · Kredit: {formatRupiah(totalKredit)}</span>
                <span>{balanced ? '✓ Seimbang' : 'Belum seimbang'}</span>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShow(false)} className="flex-1 border rounded-xl py-2 text-sm font-medium">Batal</button>
                <button onClick={save} disabled={!balanced || saving} className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50">{saving ? 'Menyimpan…' : 'Simpan jurnal'}</button>
              </div>
            </div>
          </div>
        )}
    </main>
  )
}
