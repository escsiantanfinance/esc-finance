'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah, formatTanggal, type Akun } from '@/lib/supabase'
import { Plus, PlusCircle } from 'lucide-react'

type Line = { akun_id: string; debit: string; kredit: string }

const SUMBER_BADGE: Record<string, string> = {
  persembahan: 'badge badge-green',
  pengeluaran: 'badge badge-blue',
  manual:      'badge badge-gray',
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
    <main className="flex-1 p-6 lg:p-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Jurnal Umum</h1>
          <p className="page-subtitle">Pencatatan transaksi &amp; penyesuaian manual (double-entry)</p>
        </div>
        <button onClick={() => setShow(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Jurnal Baru
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="tbl-head">
            <tr>{['Tanggal', 'Keterangan', 'Akun (Debit / Kredit)', 'Sumber', 'Nilai'].map(h => (
              <th key={h} className="tbl-th">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8">
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="h-4 bg-brand-50 rounded-full w-24 animate-pulse" />
                      <div className="h-4 bg-brand-50 rounded-full flex-1 animate-pulse" />
                    </div>
                  ))}
                </div>
              </td></tr>
            ) : jurnal.length === 0 ? (
              <tr><td colSpan={5} className="py-16 text-center text-gray-400 text-sm">Belum ada jurnal</td></tr>
            ) : jurnal.map(j => {
              const nilai = (j.detail ?? []).reduce((s: number, d: any) => s + Number(d.debit), 0)
              return (
                <tr key={j.id} className="tbl-row align-top">
                  <td className="tbl-td whitespace-nowrap">{formatTanggal(j.tanggal)}</td>
                  <td className="tbl-td max-w-[200px] font-medium text-gray-800">{j.keterangan}</td>
                  <td className="tbl-td text-xs text-gray-500 space-y-0.5">
                    {(j.detail ?? []).map((d: any, i: number) => (
                      <div key={i}>
                        <span className="font-medium text-gray-700">{d.akun?.kode_akun} {d.akun?.nama_akun}</span>
                        {' — '}
                        {Number(d.debit) > 0
                          ? <span className="text-emerald-600 font-semibold">D {formatRupiah(d.debit)}</span>
                          : <span className="text-rose-500 font-semibold">K {formatRupiah(d.kredit)}</span>}
                      </div>
                    ))}
                  </td>
                  <td className="tbl-td"><span className={`${SUMBER_BADGE[j.sumber]} capitalize`}>{j.sumber}</span></td>
                  <td className="tbl-td font-bold text-gray-800 whitespace-nowrap">{formatRupiah(nilai)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-box max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg text-gray-900">Jurnal Baru</h3>
              <p className="text-sm text-gray-400 mt-1">Pastikan total Debit = Kredit (double-entry)</p>
            </div>
            <div className="modal-body">
              <div className="flex gap-3 mb-4">
                <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="form-input w-auto" />
                <input placeholder="Keterangan" value={keterangan} onChange={e => setKeterangan(e.target.value)} className="form-input flex-1" />
              </div>
              <div className="space-y-2.5">
                {lines.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <select value={l.akun_id} onChange={e => setLine(i, { akun_id: e.target.value })} className="form-input flex-1">
                      <option value="">— Pilih akun —</option>
                      {akun.map(a => <option key={a.id} value={a.id}>{a.kode_akun} · {a.nama_akun}</option>)}
                    </select>
                    <input type="number" placeholder="Debit" value={l.debit} onChange={e => setLine(i, { debit: e.target.value, kredit: '' })} className="form-input w-28" />
                    <input type="number" placeholder="Kredit" value={l.kredit} onChange={e => setLine(i, { kredit: e.target.value, debit: '' })} className="form-input w-28" />
                  </div>
                ))}
              </div>
              <button onClick={() => setLines([...lines, { akun_id: '', debit: '', kredit: '' }])}
                className="flex items-center gap-1.5 text-brand-600 text-xs font-semibold mt-3 hover:text-brand-700">
                <PlusCircle className="w-3.5 h-3.5" /> Tambah baris
              </button>
              <div className={`flex justify-between text-sm mt-4 px-3 py-2.5 rounded-xl font-semibold ${balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                <span>Debit: {formatRupiah(totalDebit)} · Kredit: {formatRupiah(totalKredit)}</span>
                <span>{balanced ? '✓ Seimbang' : 'Belum seimbang'}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShow(false)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={save} disabled={!balanced || saving} className="btn-primary flex-1 justify-center">{saving ? 'Menyimpan…' : 'Simpan Jurnal'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
