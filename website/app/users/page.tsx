'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, formatTanggal } from '@/lib/supabase'
import ScopeBanner from '@/components/ScopeBanner'
import { Settings, KeyRound, Trash2, Plus, UserPlus } from 'lucide-react'

const EDITABLE_ROLES = ['admin', 'bendahara', 'majelis', 'volunteer']
const ROLE_BADGE: Record<string, string> = {
  admin: 'badge badge-violet',
  bendahara: 'badge badge-blue',
  majelis: 'badge badge-green',
  volunteer: 'badge badge-gray',
}

const ALL_PAGES = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/persembahan', label: 'Persembahan' },
  { path: '/perpuluhan', label: 'Perpuluhan' },
  { path: '/pengeluaran', label: 'Pengeluaran' },
  { path: '/jurnal', label: 'Jurnal Umum' },
  { path: '/buku-besar', label: 'Buku Besar' },
  { path: '/laporan', label: 'Laporan & Neraca' },
]

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [isSuper, setIsSuper] = useState(false)
  
  const emptyForm = { email: '', full_name: '', password: '', role: 'bendahara' }
  const [form, setForm] = useState({ ...emptyForm })
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [resetPwdUser, setResetPwdUser] = useState<any>(null)
  const [newPassword, setNewPassword] = useState('')

  const [settingsUser, setSettingsUser] = useState<any>(null)
  const [allKas, setAllKas] = useState<any[]>([])
  const [userKasIds, setUserKasIds] = useState<Set<string>>(new Set())
  const [kasSaving, setKasSaving] = useState(false)
  const [kasMsg, setKasMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAllowed(false); return }
      const { data: p } = await supabase.from('profiles').select('role, is_super_admin').eq('id', user.id).single()
      const sup = !!p?.is_super_admin
      setIsSuper(sup)
      setAllowed(sup || p?.role === 'admin')
      if (sup || p?.role === 'admin') { load() }
    })
  }, [])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    if (data) setUsers(data)
    setLoading(false)
    const { data: k } = await supabase.from('kas').select('id, nama, penanggung_jawab').eq('is_aktif', true).order('urutan')
    if (k) setAllKas(k)
  }

  async function patchUser(id: string, updates: any) {
    await supabase.from('profiles').update(updates).eq('id', id)
    load()
  }

  async function addUser() {
    if (!form.email || !form.password || form.password.length < 6) { setMsg('✗ Email & Sandi min. 6 karakter wajib diisi'); return }
    setSaving(true); setMsg('')
    const res = await fetch('/api/admin/create-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setSaving(false)
    if (!res.ok) { const e = await res.json(); setMsg('✗ Gagal: ' + (e.error || 'Unknown error')); return }
    setShow(false); load()
  }

  async function delUser(id: string, email: string) {
    if (!confirm(`Hapus permanen akun ${email}?`)) return
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id })
    })
    if (!res.ok) { const e = await res.json(); alert('Gagal: ' + e.error) }
    load()
  }

  async function changePassword() {
    if (newPassword.length < 6) return alert('Kata sandi minimal 6 karakter.')
    setSaving(true)
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: resetPwdUser.id, newPassword })
    })
    setSaving(false)
    if (!res.ok) { const e = await res.json(); alert('Gagal reset sandi: ' + e.error) }
    else { alert('Kata sandi berhasil diubah!'); setResetPwdUser(null); setNewPassword('') }
  }

  async function openSettings(user: any) {
    setSettingsUser(user)
    setKasMsg('')
    const { data } = await supabase.from('user_kas_akses').select('kas_id').eq('user_id', user.id)
    setUserKasIds(new Set((data || []).map(d => d.kas_id)))
  }

  function toggleKas(id: string) {
    const next = new Set(userKasIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setUserKasIds(next)
  }

  async function togglePage(user: any, path: string) {
    const current = user.allowed_pages || []
    const next = current.includes(path) ? current.filter((p: string) => p !== path) : [...current, path]
    await patchUser(user.id, { allowed_pages: next })
    setSettingsUser({ ...user, allowed_pages: next })
  }

  async function saveKasAccess() {
    if (!settingsUser) return
    setKasSaving(true); setKasMsg('')
    await supabase.from('user_kas_akses').delete().eq('user_id', settingsUser.id)
    if (userKasIds.size > 0) {
      const inserts = Array.from(userKasIds).map(kid => ({ user_id: settingsUser.id, kas_id: kid }))
      await supabase.from('user_kas_akses').insert(inserts)
    }
    setKasSaving(false)
    setKasMsg('✓ Pengaturan kas berhasil disimpan')
    setTimeout(() => { setSettingsUser(null) }, 1000)
  }

  if (allowed === null) return <main className="flex-1 p-6 lg:p-8 text-gray-400">Memuat…</main>
  if (!allowed) return (
    <main className="flex-1 p-6 lg:p-8">
      <div className="card p-6 max-w-lg border-amber-200 bg-amber-50">
        <h1 className="font-bold text-lg text-amber-800">🔒 Akses dibatasi</h1>
        <p className="text-amber-700 text-sm mt-1">Halaman Kelola Pengguna hanya untuk Admin.</p>
      </div>
    </main>
  )

  return (
    <main className="flex-1 p-6 lg:p-8">
      <ScopeBanner />
      <div className="page-header">
        <div>
          <h1 className="page-title">Kelola Pengguna</h1>
          <p className="page-subtitle">Akun tim, role, izin approve, &amp; akses kas</p>
        </div>
        <button onClick={() => { setForm({ ...emptyForm }); setMsg(''); setShow(true) }} className="btn-primary">
          <UserPlus className="w-4 h-4" /> Tambah Akun
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="tbl-head">
            <tr>{['Email', 'Nama', 'Role', 'Izin approve', 'Akses', 'Login terakhir', 'Aksi'].map((h, i) => (
              <th key={h} className={`tbl-th ${i === 2 ? 'w-32' : i === 3 ? 'w-28' : i === 4 ? 'w-28' : i === 6 ? 'w-32' : ''}`}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">Memuat…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">Belum ada pengguna</td></tr>
            ) : users.map(u => {
              const isProtected = u.is_super_admin || (!isSuper && u.role === 'admin')
              return (
                <tr key={u.id} className="tbl-row">
                  <td className="tbl-td font-medium text-gray-800">{u.email}</td>
                  <td className="tbl-td text-gray-600">{u.full_name ?? '-'}</td>
                  <td className="tbl-td">
                    {isProtected ? (
                      <span className={`${ROLE_BADGE[u.role] ?? 'badge badge-gray'} capitalize`}>{u.role ?? '-'}</span>
                    ) : (
                      <select value={u.role} onChange={e => patchUser(u.id, { role: e.target.value })} className="form-input py-1.5 px-2 text-xs w-full capitalize">
                        {EDITABLE_ROLES.filter(r => isSuper || r !== 'admin').map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                    {u.is_super_admin && <span className="ml-1 badge badge-violet">super</span>}
                  </td>
                  <td className="tbl-td">
                    {isProtected ? <span className="text-xs text-gray-400 font-medium">selalu</span> : (
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={!!u.boleh_approve_pengeluaran} onChange={e => patchUser(u.id, { boleh_approve_pengeluaran: e.target.checked })} className="accent-brand-600 rounded" />
                        boleh ACC
                      </label>
                    )}
                  </td>
                  <td className="tbl-td">
                    {isProtected ? <span className="text-xs text-gray-400 font-medium">semua akses</span> :
                      isSuper ? (
                        <button onClick={() => openSettings(u)} title="Pengaturan Akses" className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">
                          <Settings className="w-4 h-4" />
                        </button>
                      ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="tbl-td text-gray-500 text-xs">{u.last_sign_in_at ? formatTanggal(u.last_sign_in_at) : 'belum pernah'}</td>
                  <td className="tbl-td">
                    {isProtected && !isSuper ? (
                      <span className="text-xs text-gray-300">terlindungi</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        {isSuper && (
                          <button onClick={() => setResetPwdUser(u)} title="Ganti Sandi" className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        {!(isSuper && u.id === users.find(u => u.is_super_admin)?.id) && ( // Jangan hapus superadmin pertama
                          <button onClick={() => delUser(u.id, u.email)} title="Hapus" className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!isSuper && <p className="text-[11px] text-gray-400 mt-3 font-medium">Pengaturan akses kas &amp; sandi tim hanya untuk Super Admin.</p>}

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg text-gray-900">Tambah Akun Tim</h3>
            </div>
            <div className="modal-body space-y-4">
              <div className="space-y-1.5">
                <label className="form-label">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="form-input" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Nama Lengkap</label>
                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="form-input" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Kata Sandi Awal (min. 6)</label>
                <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="form-input" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="form-input">
                  {isSuper && <option value="admin">Admin</option>}
                  <option value="bendahara">Bendahara (kelola transaksi)</option>
                  <option value="majelis">Majelis (verifikator)</option>
                  <option value="volunteer">Volunteer (pencatat lap. saja)</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1 font-medium">Sesuai kebijakan, tidak ada opsi Super Admin di sini.</p>
              </div>
              {msg && <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-xl mt-2">{msg}</p>}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShow(false)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={addUser} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Membuat…' : 'Buat Akun'}</button>
            </div>
          </div>
        </div>
      )}

      {resetPwdUser && (
        <div className="modal-overlay" onClick={() => setResetPwdUser(null)}>
          <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg text-gray-900">Ganti Kata Sandi</h3>
              <p className="text-sm text-gray-500 mt-1">Reset sandi untuk <strong>{resetPwdUser.full_name || resetPwdUser.email}</strong>.</p>
            </div>
            <div className="modal-body space-y-4">
              <div className="space-y-1.5">
                <label className="form-label">Sandi Baru (min. 6)</label>
                <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="form-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setResetPwdUser(null)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={changePassword} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {settingsUser && (
        <div className="modal-overlay" onClick={() => setSettingsUser(null)}>
          <div className="modal-box max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="modal-header shrink-0">
              <h3 className="font-bold text-lg text-gray-900">Pengaturan Akses</h3>
              <p className="text-sm text-gray-500 mt-1">{settingsUser.full_name ?? settingsUser.email}</p>
            </div>
            
            <div className="modal-body flex-1 overflow-y-auto space-y-6 pr-1 my-4">
              <div>
                <h4 className="font-semibold text-sm mb-3 text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg inline-block">Akses Kas Mobile</h4>
                <div className="space-y-1">
                  {allKas.map(k => (
                    <label key={k.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-100 transition-all">
                      <div>
                        <span className="font-semibold text-sm text-gray-800">{k.nama}</span>
                        {k.penanggung_jawab && <p className="text-xs text-gray-400 mt-0.5">{k.penanggung_jawab}</p>}
                      </div>
                      <input type="checkbox" checked={userKasIds.has(k.id)} onChange={() => toggleKas(k.id)} className="accent-brand-600 w-4 h-4" />
                    </label>
                  ))}
                  {allKas.length === 0 && <p className="text-gray-400 text-sm">Belum ada kas aktif.</p>}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-3 text-violet-700 bg-violet-50 px-3 py-1.5 rounded-lg inline-block">Akses Halaman Web</h4>
                <div className="space-y-1">
                  {ALL_PAGES.map(p => {
                    const checked = (settingsUser.allowed_pages ?? []).includes(p.path)
                    return (
                      <label key={p.path} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-100 transition-all">
                        <div>
                          <span className="font-semibold text-sm text-gray-800">{p.label}</span>
                          <span className="text-xs text-gray-400 font-normal ml-2">{p.path}</span>
                        </div>
                        <input type="checkbox" checked={checked} onChange={() => togglePage(settingsUser, p.path)} className="accent-violet-600 w-4 h-4" />
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="modal-footer shrink-0">
              {kasMsg && <p className={`text-xs font-semibold mr-auto ${kasMsg.startsWith('✓') ? 'text-emerald-600' : 'text-rose-600'}`}>{kasMsg}</p>}
              <button onClick={saveKasAccess} disabled={kasSaving} className="btn-primary w-full justify-center py-2.5">
                {kasSaving ? 'Menyimpan…' : 'Selesai & Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
