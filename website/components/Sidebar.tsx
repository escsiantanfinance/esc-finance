'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase, type UserRole } from '@/lib/supabase'

type Visibility = 'all' | 'staff' | 'super'

const navItems: { href: string; label: string; icon: string; vis: Visibility }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠', vis: 'all' },
  { href: '/sesi-ibadah', label: 'Sesi Ibadah', icon: '💵', vis: 'all' },
  { href: '/persembahan', label: 'Persembahan', icon: '💝', vis: 'all' },
  { href: '/pengeluaran', label: 'Pengeluaran', icon: '🧾', vis: 'all' },
  { href: '/anggaran', label: 'Anggaran', icon: '📅', vis: 'all' },
  { href: '/perpuluhan', label: 'Perpuluhan', icon: '✅', vis: 'all' },
  { href: '/akun', label: 'Akun & Kas', icon: '💳', vis: 'staff' },
  { href: '/jurnal', label: 'Jurnal Umum', icon: '📒', vis: 'staff' },
  { href: '/laporan', label: 'Laporan', icon: '📊', vis: 'all' },
  { href: '/backup', label: 'Backup', icon: '🗄️', vis: 'super' },
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
    if (vis === 'super') return isSuper
    return false
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col shrink-0">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⛪</span>
          <div>
            <p className="font-bold text-lg leading-tight">ESC Siantan</p>
            <p className="text-slate-400 text-xs">Admin keuangan</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.filter(i => canSee(i.vis)).map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium
                ${isActive ? 'bg-blue-700 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <span className="text-lg w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        {name && <p className="text-slate-300 text-xs mb-2 px-2 truncate">👤 {name}{role ? ` · ${role}` : ''}</p>}
        <button onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
          <span className="text-lg w-5 text-center">🚪</span> Keluar
        </button>
      </div>
    </aside>
  )
}
