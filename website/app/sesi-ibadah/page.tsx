'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah, formatTanggal, type SesiIbadah } from '@/lib/supabase'
import { RowAction } from '@/components/RowAction'
import ScopeBanner from '@/components/ScopeBanner'
import Link from 'next/link'

const STATUS_BADGE: Record<string, { c: string; t: string }> = {
  draft:         { c: 'badge badge-yellow', t: 'Draft' },
  balanced:      { c: 'badge badge-blue',   t: 'Balanced' },
  signed_locked: { c: 'badge badge-green',  t: '🔒 Terkunci' },
}

export default function SesiIbadahPage() {
  const [data, setData] = useState<SesiIbadah[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string>('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [editSesi, setEditSesi] = useState<SesiIbadah | null>(null)
  const [editNama, setEditNama] = useState('')
  const [editTanggal, setEditTanggal] = useState('')
  const [editJam, setEditJam] = useState('')

  async function load() {
    const { data: rows } = await supabase.from('sesi_ibadah')
      .select('*, kas:kas_id(nama)').order('tanggal', { ascending: false }).limit(50)
    if (rows) setData(rows as any)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('role, is_super_admin').eq('id', user.id).single()
      if (p) { setRole(p.role); setIsSuperAdmin(!!p.is_super_admin) }
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function delSesi(s: SesiIbadah) {
    if (s.status === 'signed_locked') { alert('Sesi yang sudah terkunci tidak bisa dihapus.'); return }
    if (!confirm(`Hapus sesi "${s.jenis_ibadah}" (${s.tanggal})? Denominasi & kategori sesi ini ikut terhapus. Permanen.`)) return
    const { error: e1 } = await supabase.from('persembahan').delete().eq('sesi_id', s.id)
    if (e1) { alert('Gagal hapus persembahan sesi: ' + e1.message); return }
    const { error: e2 } = await supabase.from('sesi_ibadah').delete().eq('id', s.id)
    if (e2) { alert('Gagal hapus sesi: ' + e2.message); return }
    load()
  }

  function openEdit(s: SesiIbadah) {
    setEditSesi(s)
    setEditNama(s.nama_sesi || s.jenis_ibadah || '')
    setEditTanggal(s.tanggal)
    setEditJam(s.jam?.slice(0, 5) || '')
  }

  async function saveEdit() {
    if (!editSesi) return
    const { error } = await supabase.from('sesi_ibadah').update({
      nama_sesi: editNama,
      jenis_ibadah: editNama,
      tanggal: editTanggal,
      jam: editJam || null,
    }).eq('id', editSesi.id)
    if (error) { alert('Gagal: ' + error.message); return }
    setEditSesi(null)
    load()
  }

  return (
    <>
      <main className="flex-1 p-6 lg:p-8">
        <ScopeBanner />
        <div className="page-header">
          <div>
            <h1 className="page-title">Sesi Ibadah</h1>
            <p className="page-subtitle">Rekonsiliasi kas pasca-ibadah (dari aplikasi mobile)</p>
          </div>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="tbl-head">
              <tr>
                {['Tanggal', 'Nama Sesi', 'Kas', 'Total Fisik', 'Balancing', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="tbl-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-8">
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
                <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">Belum ada sesi ibadah</td></tr>
              ) : data.map(s => {
                const match = Number(s.selisih) === 0
                const badge = STATUS_BADGE[s.status] ?? { c: 'badge badge-gray', t: s.status }
                return (
                  <tr key={s.id} className="tbl-row">
                    <td className="tbl-td whitespace-nowrap">{formatTanggal(s.tanggal)}{s.jam ? `, ${s.jam.slice(0, 5)}` : ''}</td>
                    <td className="tbl-td">
                      <span className="font-semibold text-gray-800">{s.nama_sesi || s.jenis_ibadah}</span>
                      {s.nama_sesi && <span className="block text-xs text-gray-400">{s.jenis_ibadah}</span>}
                    </td>
                    <td className="tbl-td text-gray-500">{s.kas?.nama ?? '-'}</td>
                    <td className="tbl-td font-bold text-gray-800">{formatRupiah(s.total_fisik)}</td>
                    <td className="tbl-td">
                      <span className={match ? 'badge badge-green' : 'badge badge-red'}>{match ? 'MATCH' : 'MISMATCH'}</span>
                    </td>
                    <td className="tbl-td"><span className={badge.c}>{badge.t}</span></td>
                    <td className="tbl-td">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/sesi-ibadah/${s.id}`}>
                          <RowAction>Lihat</RowAction>
                        </Link>
                        {isSuperAdmin && s.status !== 'signed_locked' && (
                          <RowAction variant="default" onClick={() => openEdit(s)}>Edit</RowAction>
                        )}
                        {s.status !== 'signed_locked' && role !== 'bendahara' && (
                          <RowAction variant="danger" onClick={() => delSesi(s)}>Hapus</RowAction>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      {editSesi && (
        <div className="modal-overlay" onClick={() => setEditSesi(null)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg text-gray-900">Edit Sesi Ibadah</h3>
            </div>
            <div className="modal-body space-y-4">
              <div className="space-y-1.5">
                <label className="form-label">Nama Sesi</label>
                <input className="form-input" value={editNama} onChange={e => setEditNama(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Tanggal</label>
                <input type="date" className="form-input" value={editTanggal} onChange={e => setEditTanggal(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Jam (opsional)</label>
                <input type="time" className="form-input" value={editJam} onChange={e => setEditJam(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditSesi(null)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={saveEdit} className="btn-primary flex-1 justify-center">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
