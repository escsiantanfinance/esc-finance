'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase, formatTanggal } from '@/lib/supabase'
import ScopeBanner from '@/components/ScopeBanner'
import {
  Settings, KeyRound, Trash2, UserPlus, ShieldCheck, Wallet,
  MonitorSmartphone, Check, X, Users as UsersIcon, Crown,
} from 'lucide-react'

const EDITABLE_ROLES = ['admin', 'bendahara', 'majelis', 'volunteer']

// Meta per-role: label rapi, warna badge, dan gradient avatar.
const ROLE_META: Record<string, { label: string; badge: string; avatar: string }> = {
  admin:     { label: 'Admin',     badge: 'bg-violet-100 text-violet-700',   avatar: 'from-violet-500 to-purple-600' },
  bendahara: { label: 'Bendahara', badge: 'bg-blue-100 text-blue-700',       avatar: 'from-blue-500 to-indigo-600' },
  majelis:   { label: 'Majelis',   badge: 'bg-emerald-100 text-emerald-700', avatar: 'from-emerald-500 to-teal-600' },
  volunteer: { label: 'Volunteer', badge: 'bg-gray-100 text-gray-600',       avatar: 'from-gray-400 to-gray-500' },
}
const metaOf = (role: string) => ROLE_META[role] ?? ROLE_META.volunteer

function initials(name: string, email: string) {
  const src = (name || '').trim() || (email || '')
  const parts = src.split(/[\s@._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
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

/** Toggle switch ala iOS untuk izin approve. */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-1
        ${checked ? 'bg-brand-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[18px]' : 'translate-x-1'}`} />
    </button>
  )
}

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

  async function setAllPages(user: any, all: boolean) {
    const next = all ? ALL_PAGES.map(p => p.path) : []
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

  const settingsMeta = settingsUser ? metaOf(settingsUser.role) : ROLE_META.volunteer
  const pageCount = settingsUser ? (settingsUser.allowed_pages ?? []).length : 0

  return (
    <main className="flex-1 p-6 lg:p-8">
      <ScopeBanner />
      <div className="page-header">
        <div>
          <h1 className="page-title">Kelola Pengguna</h1>
          <p className="page-subtitle">Akun tim, role, izin approve, &amp; akses kas</p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 px-3 py-2 rounded-xl">
              <UsersIcon className="w-3.5 h-3.5" /> {users.length} akun
            </span>
          )}
          <button onClick={() => { setForm({ ...emptyForm }); setMsg(''); setShow(true) }} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Tambah Akun
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="tbl-head">
              <tr>
                <th className="tbl-th">Pengguna</th>
                <th className="tbl-th w-40">Role</th>
                <th className="tbl-th w-32">Izin Approve</th>
                <th className="tbl-th w-28">Akses Kas</th>
                <th className="tbl-th w-36">Login Terakhir</th>
                <th className="tbl-th w-24 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="tbl-td">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-28 bg-gray-100 rounded-full animate-pulse" />
                          <div className="h-2.5 w-40 bg-gray-100 rounded-full animate-pulse" />
                        </div>
                      </div>
                    </td>
                    <td className="tbl-td"><div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" /></td>
                    <td className="tbl-td"><div className="h-5 w-9 bg-gray-100 rounded-full animate-pulse" /></td>
                    <td className="tbl-td"><div className="h-6 w-14 bg-gray-100 rounded-lg animate-pulse" /></td>
                    <td className="tbl-td"><div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" /></td>
                    <td className="tbl-td"><div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-gray-400 text-sm">Belum ada pengguna</td></tr>
              ) : users.map(u => {
                const isProtected = u.is_super_admin || (!isSuper && u.role === 'admin')
                const meta = metaOf(u.role)
                const isFirstSuper = u.id === users.find(x => x.is_super_admin)?.id
                return (
                  <tr key={u.id} className="tbl-row">
                    {/* Identitas */}
                    <td className="tbl-td">
                      <div className="flex items-center gap-3">
                        <div className={`grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br ${meta.avatar} text-white text-xs font-bold shrink-0`}>
                          {initials(u.full_name, u.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate flex items-center gap-1.5">
                            {u.full_name || 'Tanpa nama'}
                            {u.is_super_admin && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="tbl-td">
                      {isProtected ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`badge ${meta.badge}`}>{meta.label}</span>
                          {u.is_super_admin && <span className="badge bg-amber-100 text-amber-700">Super</span>}
                        </div>
                      ) : (
                        <select
                          value={u.role}
                          onChange={e => patchUser(u.id, { role: e.target.value })}
                          className="border border-gray-200 rounded-lg py-1.5 pl-3 pr-8 text-sm bg-white capitalize min-w-[128px] focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-shadow cursor-pointer"
                        >
                          {EDITABLE_ROLES.filter(r => isSuper || r !== 'admin').map(r => (
                            <option key={r} value={r}>{metaOf(r).label}</option>
                          ))}
                        </select>
                      )}
                    </td>

                    {/* Izin approve */}
                    <td className="tbl-td">
                      {isProtected ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                          <ShieldCheck className="w-3.5 h-3.5" /> Selalu
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Toggle
                            checked={!!u.boleh_approve_pengeluaran}
                            onChange={v => patchUser(u.id, { boleh_approve_pengeluaran: v })}
                          />
                          <span className={`text-xs font-medium ${u.boleh_approve_pengeluaran ? 'text-gray-700' : 'text-gray-400'}`}>
                            {u.boleh_approve_pengeluaran ? 'Boleh' : 'Tidak'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Akses kas */}
                    <td className="tbl-td">
                      {isProtected ? (
                        <span className="text-xs text-gray-400">Semua kas</span>
                      ) : isSuper ? (
                        <button
                          onClick={() => openSettings(u)}
                          title="Atur akses kas & halaman"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5" /> Atur
                        </button>
                      ) : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Login terakhir */}
                    <td className="tbl-td">
                      {u.last_sign_in_at ? (
                        <span className="text-xs text-gray-500">{formatTanggal(u.last_sign_in_at)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" /> Belum pernah
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="tbl-td">
                      {isProtected && !isSuper ? (
                        <span className="block text-right text-xs text-gray-300">Terlindungi</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {isSuper && (
                            <button onClick={() => setResetPwdUser(u)} title="Ganti sandi" className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                              <KeyRound className="w-4 h-4" />
                            </button>
                          )}
                          {!(isSuper && isFirstSuper) && (
                            <button onClick={() => delUser(u.id, u.email)} title="Hapus akun" className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
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
      </div>

      {!isSuper && <p className="text-[11px] text-gray-400 mt-3 font-medium">Pengaturan akses kas &amp; sandi tim hanya untuk Super Admin.</p>}

      {/* ── Modal: Tambah Akun ─────────────────────────────── */}
      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="grid place-items-center w-11 h-11 rounded-xl bg-brand-gradient text-white shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 leading-tight">Tambah Akun Tim</h3>
                  <p className="text-sm text-gray-400">Buat kredensial untuk anggota baru</p>
                </div>
              </div>
            </div>
            <div className="modal-body space-y-4">
              <div className="space-y-1.5">
                <label className="form-label">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="form-input" placeholder="anggota@gereja.id" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Nama Lengkap</label>
                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="form-input" placeholder="mis. Melvin Agustin" />
              </div>
              <div className="space-y-1.5">
                <label className="form-label">Kata Sandi Awal (min. 6)</label>
                <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="form-input" placeholder="••••••" />
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
              {msg && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl mt-2">{msg}</p>}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShow(false)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={addUser} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Membuat…' : 'Buat Akun'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Ganti Sandi ─────────────────────────────── */}
      {resetPwdUser && (
        <div className="modal-overlay" onClick={() => setResetPwdUser(null)}>
          <div className="modal-box max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="grid place-items-center w-11 h-11 rounded-xl bg-amber-100 text-amber-600 shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 leading-tight">Ganti Kata Sandi</h3>
                  <p className="text-sm text-gray-500 truncate">{resetPwdUser.full_name || resetPwdUser.email}</p>
                </div>
              </div>
            </div>
            <div className="modal-body space-y-4">
              <div className="space-y-1.5">
                <label className="form-label">Sandi Baru (min. 6)</label>
                <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="form-input" placeholder="••••••" />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setResetPwdUser(null)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={changePassword} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Pengaturan Akses ────────────────────────── */}
      {settingsUser && (
        <div className="modal-overlay" onClick={() => setSettingsUser(null)}>
          <div className="modal-box max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="modal-header shrink-0 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`grid place-items-center w-11 h-11 rounded-full bg-gradient-to-br ${settingsMeta.avatar} text-white font-bold shrink-0`}>
                  {initials(settingsUser.full_name, settingsUser.email)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 leading-tight truncate">Pengaturan Akses</h3>
                  <p className="text-sm text-gray-500 truncate">{settingsUser.full_name ?? settingsUser.email}</p>
                </div>
              </div>
              <button onClick={() => setSettingsUser(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
                <X className="w-[18px] h-[18px]" />
              </button>
            </div>

            <div className="modal-body flex-1 overflow-y-auto space-y-6 pr-1 my-2">
              {/* Akses Kas Mobile */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid place-items-center w-8 h-8 rounded-lg bg-brand-50 text-brand-600 shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-gray-800">Akses Kas Mobile</h4>
                      <p className="text-xs text-gray-400">Kas yang bisa dikelola di aplikasi HP</p>
                    </div>
                  </div>
                  <span className="badge bg-brand-50 text-brand-600 shrink-0">{userKasIds.size}/{allKas.length}</span>
                </div>
                {allKas.length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setUserKasIds(new Set(allKas.map(k => k.id)))} className="text-[11px] font-semibold text-brand-600 hover:text-brand-700">Pilih semua</button>
                    <span className="text-gray-200">·</span>
                    <button onClick={() => setUserKasIds(new Set())} className="text-[11px] font-semibold text-gray-400 hover:text-gray-600">Kosongkan</button>
                  </div>
                )}
                <div className="space-y-1.5">
                  {allKas.map(k => {
                    const on = userKasIds.has(k.id)
                    return (
                      <label key={k.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border transition-all
                        ${on ? 'border-brand-200 bg-brand-50/60' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <span className={`grid place-items-center w-5 h-5 rounded-md border-2 shrink-0 transition-colors ${on ? 'bg-brand-600 border-brand-600' : 'border-gray-300 bg-white'}`}>
                          {on && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </span>
                        <input type="checkbox" checked={on} onChange={() => toggleKas(k.id)} className="sr-only" />
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-sm text-gray-800">{k.nama}</span>
                          {k.penanggung_jawab && <p className="text-xs text-gray-400 mt-0.5">{k.penanggung_jawab}</p>}
                        </div>
                      </label>
                    )
                  })}
                  {allKas.length === 0 && <p className="text-gray-400 text-sm px-1">Belum ada kas aktif.</p>}
                </div>
              </section>

              {/* Akses Halaman Web */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid place-items-center w-8 h-8 rounded-lg bg-violet-50 text-violet-600 shrink-0">
                      <MonitorSmartphone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-gray-800">Akses Halaman Web</h4>
                      <p className="text-xs text-gray-400">Menu yang tampil untuk pengguna ini</p>
                    </div>
                  </div>
                  <span className="badge bg-violet-50 text-violet-600 shrink-0">{pageCount}/{ALL_PAGES.length}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setAllPages(settingsUser, true)} className="text-[11px] font-semibold text-violet-600 hover:text-violet-700">Pilih semua</button>
                  <span className="text-gray-200">·</span>
                  <button onClick={() => setAllPages(settingsUser, false)} className="text-[11px] font-semibold text-gray-400 hover:text-gray-600">Kosongkan</button>
                </div>
                <div className="space-y-1.5">
                  {ALL_PAGES.map(p => {
                    const on = (settingsUser.allowed_pages ?? []).includes(p.path)
                    return (
                      <label key={p.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border transition-all
                        ${on ? 'border-violet-200 bg-violet-50/60' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <span className={`grid place-items-center w-5 h-5 rounded-md border-2 shrink-0 transition-colors ${on ? 'bg-violet-600 border-violet-600' : 'border-gray-300 bg-white'}`}>
                          {on && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </span>
                        <input type="checkbox" checked={on} onChange={() => togglePage(settingsUser, p.path)} className="sr-only" />
                        <div className="min-w-0 flex-1 flex items-baseline gap-2">
                          <span className="font-semibold text-sm text-gray-800">{p.label}</span>
                          <span className="text-xs text-gray-400 font-normal">{p.path}</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </section>
            </div>

            <div className="modal-footer shrink-0 items-center">
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
