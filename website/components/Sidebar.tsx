'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase, type UserRole } from '@/lib/supabase'

type Visibility = 'all' | 'staff' | 'admin' | 'super'
type NavItem = { href: string; label: string; icon: string; vis: Visibility }

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Utama',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '🏠', vis: 'all' },
      { href: '/sesi-ibadah', label: 'Sesi Ibadah', icon: '💵', vis: 'all' },
      { href: '/persembahan', label: 'Persembahan', icon: '💝', vis: 'all' },
      { href: '/pengeluaran', label: 'Pengeluaran', icon: '🧾', vis: 'all' },
      { href: '/anggaran', label: 'Anggaran', icon: '📅', vis: 'all' },
      { href: '/perpuluhan', label: 'Perpuluhan', icon: '✅', vis: 'all' },
    ],
  },
  {
    title: 'Akuntansi',
    items: [
      { href: '/akun', label: 'Akun & Kas', icon: '💳', vis: 'staff' },
      { href: '/analitik-kas', label: 'Analitik Kas', icon: '📈', vis: 'staff' },
      { href: '/jurnal', label: 'Jurnal Umum', icon: '📒', vis: 'staff' },
      { href: '/laporan', label: 'Laporan', icon: '📊', vis: 'all' },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { href: '/kategori', label: 'Kategori Persembahan', icon: '🏷️', vis: 'super' },
      { href: '/users', label: 'Kelola Pengguna', icon: '👥', vis: 'admin' },
      { href: '/backup', label: 'Backup', icon: '🗄️', vis: 'super' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<UserRole | null>(null)
  const [isSuper, setIsSuper] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('full_name, role, is_super_admin')
        .eq('id', user.id)
        .single()
      if (data) {
        setRole(data.role)
        setIsSuper(data.is_super_admin)
        setName(data.full_name)
      }
    }
    loadProfile()
  }, [])

  const isStaff = role === 'admin' || role === 'bendahara'
  function canSee(vis: Visibility) {
    if (vis === 'all') return true
    if (vis === 'staff') return isStaff
    if (vis === 'admin') return role === 'admin'
    if (vis === 'super') return isSuper
    return false
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = (name || 'AD').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white flex flex-col shrink-0 sticky top-0 h-screen">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-blue-600 text-xl shadow-lg shadow-blue-900/40">⛪</span>
          <div>
            <p className="font-bold text-[15px] leading-tight">ESC Finance</p>
            <p className="text-slate-400 text-xs">Keuangan Gereja</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map(group => {
          const visible = group.items.filter(i => canSee(i.vis))
          if (visible.length === 0) return null
          return (
            <div key={group.title}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{group.title}</p>
              <div className="space-y-0.5">
                {visible.map(item => {
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                        ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                    >
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <span className="grid place-items-center w-9 h-9 rounded-full bg-slate-700 text-xs font-bold shrink-0">{initials}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{name || 'Pengguna'}</p>
            {role && <p className="text-[11px] text-slate-400 capitalize">{role}{isSuper ? ' · super' : ''}</p>}
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-red-600/90 hover:text-white transition-colors"
        >
          <span className="text-base w-5 text-center">🚪</span> Keluar
        </button>
      </div>
    </aside>
  )
}
