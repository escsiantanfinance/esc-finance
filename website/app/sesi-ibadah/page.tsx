'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, formatRupiah, formatTanggal, type SesiIbadah } from '@/lib/supabase'
import { RowAction, RowActions } from '@/components/RowAction'
import ScopeBanner from '@/components/ScopeBanner'

const STATUS_BADGE: Record<string, { c: string; t: string }> = {
  draft: { c: 'bg-amber-100 text-amber-700', t: 'Draft' },
  balanced: { c: 'bg-blue-100 text-blue-700', t: 'Balanced' },
  signed_locked: { c: 'bg-green-100 text-green-700', t: '🔒 Terkunci' },
}

export default function SesiIbadahPage() {
  const [data, setData] = useState<SesiIbadah[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string>('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Edit modal state
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
    // hapus persembahan sesi (un-post jurnal + kembalikan saldo), lalu sesi (cascade pecahan)
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
      <main className="flex-1 p-8">
          <ScopeBanner />
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Sesi Ibadah</h1>
            <p className="text-gray-500 mt-1">Rekonsiliasi kas pasca-ibadah (dari aplikasi mobile)</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Tanggal', 'Jenis Ibadah', 'Kas', 'Total Fisik', 'Balancing', 'Status', ''].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-4">
                      <div className="space-y-4">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />)}
                      </div>
                    </td>
                  </tr>
                ) :
                  data.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada sesi ibadah</td></tr> :
                  data.map(s => {
                    const match = Number(s.selisih) === 0
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">{formatTanggal(s.tanggal)}{s.jam ? `, ${s.jam.slice(0, 5)}` : ''}</td>
                        <td className="px-4 py-3 font-medium">{s.nama_sesi || s.jenis_ibadah}{s.nama_sesi ? <span className="block text-xs font-normal text-gray-400">{s.jenis_ibadah}</span> : null}</td>
                        <td className="px-4 py-3 text-gray-500">{s.kas?.nama ?? '-'}</td>
                        <td className="px-4 py-3 font-semibold">{formatRupiah(s.total_fisik)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{match ? 'MATCH' : 'MISMATCH'}</span>
                        </td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[s.status]?.c}`}>{STATUS_BADGE[s.status]?.t}</span></td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <RowActions>
                            <RowAction href={`/sesi-ibadah/${s.id}`}>Lihat</RowAction>
                            {isSuperAdmin && s.status !== 'signed_locked' && (
                              <RowAction variant="default" onClick={() => openEdit(s)}>Edit</RowAction>
                            )}
                            {s.status !== 'signed_locked' && role !== 'bendahara' && (
                              <RowAction variant="danger" onClick={() => delSesi(s)}>Hapus</RowAction>
                            )}
                          </RowActions>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
      </main>

      {editSesi && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Edit Sesi Ibadah</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nama Sesi</label>
                <input className="mt-1 w-full border rounded-xl px-3 py-2 text-sm" value={editNama} onChange={e => setEditNama(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tanggal</label>
                <input type="date" className="mt-1 w-full border rounded-xl px-3 py-2 text-sm" value={editTanggal} onChange={e => setEditTanggal(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Jam (opsional)</label>
                <input type="time" className="mt-1 w-full border rounded-xl px-3 py-2 text-sm" value={editJam} onChange={e => setEditJam(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditSesi(null)} className="flex-1 border rounded-xl py-2 text-sm hover:bg-gray-50">Batal</button>
              <button onClick={saveEdit} className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
