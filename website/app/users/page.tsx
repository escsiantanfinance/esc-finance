'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, formatTanggal } from '@/lib/supabase'
import { RowAction } from '@/components/RowAction'

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-violet-100 text-violet-700', bendahara: 'bg-blue-100 text-blue-700',
  majelis: 'bg-slate-100 text-slate-700', volunteer: 'bg-green-100 text-green-700',
}
const EDITABLE_ROLES = ['admin', 'bendahara', 'majelis', 'volunteer']
const emptyForm = { email: '', password: '', full_name: '', role: 'bendahara' }

const ALL_PAGES = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/sesi-ibadah', label: 'Sesi Ibadah' },
  { path: '/persembahan', label: 'Persembahan' },
  { path: '/pengeluaran', label: 'Pengeluaran' },
  { path: '/anggaran', label: 'Anggaran' },
  { path: '/perpuluhan', label: 'Perpuluhan' },
  { path: '/akun', label: 'Akun & Kas' },
  { path: '/analitik-kas', label: 'Analitik Kas' },
  { path: '/jurnal', label: 'Jurnal Umum' },
  { path: '/laporan', label: 'Laporan' },
  { path: '/kategori', label: 'Kategori Persembahan' },
  { path: '/users', label: 'Kelola Pengguna' },
  { path: '/backup', label: 'Backup' },
]

export default function UsersPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [isSuper, setIsSuper] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Kelola akses kas
  const [accessUser, setAccessUser] = useState<any | null>(null)
  const [allKas, setAllKas] = useState<any[]>([])
  const [userKasIds, setUserKasIds] = useState<Set<string>>(new Set())
  const [kasSaving, setKasSaving] = useState(false)
  const [kasMsg, setKasMsg] = useState('')
  const [pageAccessUser, setPageAccessUser] = useState<any | null>(null)
  
  // Ganti Password state
  const [resetPwdUser, setResetPwdUser] = useState<any | null>(null)
  const [newPassword, setNewPassword] = useState('')

  async function load() {
    const res = await fetch('/api/users')
    if (res.ok) { const j = await res.json(); setUsers(j.users ?? []) }
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAllowed(false); return }
      const { data: p } = await supabase.from('profiles').select('role, is_super_admin').eq('id', user.id).single()
      const ok = p?.role === 'admin'
      setAllowed(ok)
      setIsSuper(!!p?.is_super_admin)
      if (ok) {
        load()
        const { data: k } = await supabase.from('kas').select('id, nama, penanggung_jawab').eq('is_aktif', true).order('urutan')
        setAllKas(k ?? [])
      }
    }
    init()
  }, [])

  async function addUser() {
    setSaving(true); setMsg('')
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const j = await res.json()
    setSaving(false)
    if (!res.ok) { setMsg('✗ ' + j.error); return }
    setShow(false); setForm({ ...emptyForm }); setMsg('✓ Akun dibuat'); load()
  }

  async function patchUser(id: string, patch: { role?: string; boleh_approve_pengeluaran?: boolean; allowed_pages?: string[] | null }) {
    setUsers(us => us.map(u => u.id === id ? { ...u, ...patch } : u)) // optimistic
    const res = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) })
    if (!res.ok) { const j = await res.json(); setMsg('✗ ' + j.error); load() }
  }

  async function delUser(id: string, email: string) {
    if (!confirm(`Hapus akun ${email}? Tindakan ini permanen.`)) return
    const res = await fetch('/api/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    const j = await res.json()
    if (!res.ok) { setMsg('✗ ' + j.error); return }
    setMsg('✓ Akun dihapus'); load()
  }

  async function openAccess(u: any) {
    setAccessUser(u)
    setKasSaving(false)
    setKasMsg('')
    const { data } = await supabase.from('kas_akses').select('kas_id').eq('user_id', u.id)
    setUserKasIds(new Set((data ?? []).map((r: any) => r.kas_id)))
  }

  function toggleKas(kasId: string) {
    // Hanya ubah state lokal — disimpan ke DB saat tombol Selesai ditekan
    setUserKasIds(prev => {
      const next = new Set(prev)
      if (next.has(kasId)) next.delete(kasId)
      else next.add(kasId)
      return next
    })
  }

  async function saveKasAccess() {
    if (!accessUser) return
    setKasSaving(true); setKasMsg('')
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: accessUser.id, kasIds: Array.from(userKasIds) }),
    })
    const j = await res.json()
    setKasSaving(false)
    if (!res.ok) { setKasMsg('✗ ' + j.error); return }
    setKasMsg('✓ Tersimpan!')
    setTimeout(() => { setAccessUser(null); setKasMsg('') }, 800)
  }

  function openPageAccess(u: any) {
    setPageAccessUser(u)
  }

  function togglePage(u: any, path: string) {
    const current = new Set<string>(u.allowed_pages ?? [])
    if (current.has(path)) current.delete(path)
    else current.add(path)
    patchUser(u.id, { allowed_pages: Array.from(current) })
  }

  async function changePassword() {
    if (!resetPwdUser || !newPassword || newPassword.length < 6) {
      setMsg('Kata sandi minimal 6 karakter.')
      return
    }
    setSaving(true); setMsg('')
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resetPwdUser.id, password: newPassword }),
    })
    const j = await res.json()
    setSaving(false)
    if (!res.ok) setMsg('✗ ' + j.error)
    else {
      setMsg('✓ Kata sandi berhasil diubah!')
      setResetPwdUser(null)
      setNewPassword('')
    }
  }

  if (allowed === null) return <main className="flex-1 p-8 text-gray-400">Memuat…</main>
  if (!allowed) return (
    <main className="flex-1 p-8"><div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 max-w-lg">
      <h1 className="font-bold text-lg text-amber-800">🔒 Akses dibatasi</h1>
      <p className="text-amber-700 text-sm mt-1">Halaman Kelola Pengguna hanya untuk Admin.</p>
    </div></main>
  )

  return (
    <main className="flex-1 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelola Pengguna</h1>
          <p className="text-gray-500 mt-1">Akun tim, role, izin approve, &amp; akses kas</p>
        </div>
        <button onClick={() => { setForm({ ...emptyForm }); setMsg(''); setShow(true) }} className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl px-4 py-2.5 text-sm font-semibold">+ Tambah Akun</button>
      </div>

      {msg && <div className="mb-4 text-sm bg-white border rounded-xl px-4 py-2.5">{msg}</div>}

      <div className="bg-white rounded-2xl shadow-soft border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Nama</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600 w-32">Role</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600 w-28">Izin approve</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600 w-44">Akses (Kas & Halaman)</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Login terakhir</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600 w-40">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Memuat / belum ada pengguna</td></tr> :
              users.map(u => {
                const isProtected = u.is_super_admin || u.role === 'admin'
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{u.email}</td>
                    <td className="px-5 py-3 text-gray-600">{u.full_name ?? '-'}</td>
                    <td className="px-5 py-3">
                      {isProtected ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>{u.role ?? '-'}</span>
                      ) : (
                        <select value={u.role} onChange={e => patchUser(u.id, { role: e.target.value })} className="border rounded-lg px-2 py-1 text-xs capitalize w-full">
                          {EDITABLE_ROLES.filter(r => isSuper || r !== 'admin').map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                      {u.is_super_admin && <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-violet-100 text-violet-700">super</span>}
                    </td>
                    <td className="px-5 py-3">
                      {isProtected ? <span className="text-xs text-gray-400">selalu</span> : (
                        <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                          <input type="checkbox" checked={!!u.boleh_approve_pengeluaran} onChange={e => patchUser(u.id, { boleh_approve_pengeluaran: e.target.checked })} />
                          boleh ACC
                        </label>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isProtected ? <span className="text-xs text-gray-400">semua akses</span> :
                        isSuper ? (
                          <div className="flex gap-1.5 flex-col items-start">
                            <RowAction onClick={() => openAccess(u)}>Atur Kas…</RowAction>
                            <RowAction onClick={() => openPageAccess(u)}>Atur Halaman…</RowAction>
                          </div>
                        ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{u.last_sign_in_at ? formatTanggal(u.last_sign_in_at) : 'belum pernah'}</td>
                    <td className="px-5 py-3">
                      {isProtected ? (
                        <span className="text-xs text-gray-300">terlindungi</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          {isSuper && <RowAction onClick={() => setResetPwdUser(u)}>Ganti Sandi</RowAction>}
                          <RowAction variant="danger" onClick={() => delUser(u.id, u.email)}>Hapus</RowAction>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {!isSuper && <p className="text-[11px] text-gray-400 mt-2">Pengaturan akses kas hanya untuk Super Admin.</p>}

      {/* Modal tambah akun */}
      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShow(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Tambah Akun Tim</h3>
            <div className="space-y-3">
              <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Nama lengkap" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
              <input type="text" placeholder="Kata sandi awal (min. 6)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
              <label className="text-sm text-gray-600 block">Role
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm mt-1">
                  {isSuper && <option value="admin">Admin</option>}
                  <option value="bendahara">Bendahara (kelola transaksi)</option>
                  <option value="majelis">Majelis (verifikator)</option>
                  <option value="volunteer">Volunteer (pencatat lap. saja)</option>
                </select>
                <span className="text-[11px] text-gray-400">Tidak ada opsi Admin/Super Admin di sini — sesuai kebijakan.</span>
              </label>
            </div>
            {msg && <p className="text-xs mt-3 text-red-600">{msg.startsWith('✗') ? msg : ''}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShow(false)} className="flex-1 border rounded-xl py-2 text-sm font-medium">Batal</button>
              <button onClick={addUser} disabled={saving} className="flex-1 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-60">{saving ? 'Membuat…' : 'Buat akun'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ganti password */}
      {resetPwdUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setResetPwdUser(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-soft" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Ganti Kata Sandi</h3>
            <p className="text-sm text-gray-500 mb-4">Reset sandi untuk <strong>{resetPwdUser.full_name || resetPwdUser.email}</strong>.</p>
            <input type="text" placeholder="Sandi baru (min 6)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setResetPwdUser(null)} className="flex-1 py-2 text-sm font-medium border rounded-xl hover:bg-gray-50">Batal</button>
              <button onClick={changePassword} disabled={saving} className="flex-1 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60">{saving ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal akses kas */}
      {accessUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setAccessUser(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-soft" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Akses Kas — {accessUser.full_name ?? accessUser.email}</h3>
            <p className="text-xs text-gray-500 mb-4">Centang kas yang boleh diakses bendahara ini di aplikasi mobile.</p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {allKas.map(k => (
                <label key={k.id} className="flex items-center gap-2.5 text-sm px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={userKasIds.has(k.id)} onChange={() => toggleKas(k.id)} />
                  <span className="font-medium">{k.nama}</span>
                  {k.penanggung_jawab && <span className="text-xs text-gray-400">· {k.penanggung_jawab}</span>}
                </label>
              ))}
              {allKas.length === 0 && <p className="text-gray-400 text-sm">Belum ada kas aktif.</p>}
            </div>
            {kasMsg && <p className={`text-xs mt-2 font-medium ${kasMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{kasMsg}</p>}
            <button onClick={saveKasAccess} disabled={kasSaving} className="w-full mt-5 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-60">{kasSaving ? 'Menyimpan…' : 'Selesai & Simpan'}</button>
          </div>
        </div>
      )}

      {/* Modal akses halaman */}
      {pageAccessUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setPageAccessUser(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Akses Halaman — {pageAccessUser.full_name ?? pageAccessUser.email}</h3>
            <p className="text-xs text-gray-500 mb-4">Pilih halaman mana yang bisa dilihat di menu sidebar (centang). Jika Anda mengosongkan semua, sistem akan kembali menggunakan aturan default berdasarkan role.</p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {ALL_PAGES.map(p => {
                const checked = (pageAccessUser.allowed_pages ?? []).includes(p.path)
                return (
                  <label key={p.path} className="flex items-center gap-2.5 text-sm px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => togglePage(pageAccessUser, p.path)} />
                    <span className="font-medium">{p.label} <span className="text-xs text-gray-400 font-normal">({p.path})</span></span>
                  </label>
                )
              })}
            </div>
            <button onClick={() => setPageAccessUser(null)} className="w-full mt-5 bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold">Selesai</button>
          </div>
        </div>
      )}
    </main>
  )
}
