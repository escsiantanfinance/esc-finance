'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase, type UserRole } from '@/lib/supabase'
import {
  LayoutDashboard, Church, HandCoins, Receipt, CalendarDays, CheckSquare,
  Landmark, BarChart3, BookOpen, FileBarChart, Tag, Users, HardDrive,
  LogOut, ChevronRight,
} from 'lucide-react'

type Visibility = 'all' | 'staff' | 'admin' | 'super' | 'oversight'
type NavItem = { href: string; label: string; icon: React.ElementType; vis: Visibility }

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Utama',
    items: [
      { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard, vis: 'all' },
      { href: '/sesi-ibadah',  label: 'Sesi Ibadah',   icon: Church,          vis: 'all' },
      { href: '/persembahan',  label: 'Persembahan',   icon: HandCoins,       vis: 'all' },
      { href: '/pengeluaran',  label: 'Pengeluaran',   icon: Receipt,         vis: 'all' },
      { href: '/anggaran',     label: 'Anggaran',      icon: CalendarDays,    vis: 'all' },
      { href: '/perpuluhan',   label: 'Perpuluhan',    icon: CheckSquare,     vis: 'all' },
    ],
  },
  {
    title: 'Akuntansi',
    items: [
      { href: '/akun',         label: 'Akun & Kas',    icon: Landmark,        vis: 'staff' },
      { href: '/analitik-kas', label: 'Analitik Kas',  icon: BarChart3,       vis: 'oversight' },
      { href: '/jurnal',       label: 'Jurnal Umum',   icon: BookOpen,        vis: 'oversight' },
      { href: '/laporan',      label: 'Laporan',       icon: FileBarChart,    vis: 'oversight' },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { href: '/kategori',     label: 'Kategori',       icon: Tag,    vis: 'super' },
      { href: '/users',        label: 'Kelola Pengguna',icon: Users,  vis: 'admin' },
      { href: '/backup',       label: 'Backup',         icon: HardDrive, vis: 'super' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<UserRole | null>(null)
  const [isSuper, setIsSuper] = useState(false)
  const [name, setName] = useState('')
  const [allowedPages, setAllowedPages] = useState<string[] | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('full_name, role, is_super_admin, allowed_pages')
        .eq('id', user.id)
        .single()
      if (data) {
        setRole(data.role)
        setIsSuper(data.is_super_admin)
        setName(data.full_name)
        if (data.allowed_pages && Array.isArray(data.allowed_pages) && data.allowed_pages.length > 0) {
          setAllowedPages(data.allowed_pages)
        }
      }
    }
    loadProfile()
  }, [])

  const isStaff = role === 'admin' || role === 'bendahara'
  function canSee(vis: Visibility, href: string) {
    if (isSuper) return true
    if (allowedPages) return allowedPages.includes(href)
    if (vis === 'all') return true
    if (vis === 'staff') return isStaff
    if (vis === 'admin') return role === 'admin'
    if (vis === 'super') return false
    if (vis === 'oversight') return role !== 'bendahara'
    return false
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = (name || 'AD').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <aside
      className={`${collapsed ? 'w-[72px]' : 'w-64'} min-h-screen flex flex-col shrink-0 sticky top-0 h-screen transition-all duration-300 z-30`}
      style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #2d1b69 60%, #1e1b4b 100%)' }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 gap-3 border-b border-white/10 shrink-0">
        <div className="grid place-items-center w-9 h-9 rounded-xl shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 4px 12px rgba(99,102,241,0.5)' }}>
          <Church className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-white text-[14px] leading-tight tracking-tight">ESC Finance</p>
            <p className="text-indigo-300/70 text-[10px]">Keuangan Gereja</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto text-indigo-300/50 hover:text-white transition-colors"
          aria-label="Toggle sidebar"
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-4 space-y-5 overflow-y-auto">
        {navGroups.map(group => {
          const visible = group.items.filter(i => canSee(i.vis, i.href))
          if (visible.length === 0) return null
          return (
            <div key={group.title}>
              {!collapsed && (
                <p className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-indigo-400/60">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {visible.map(item => {
                  const isActive = pathname.startsWith(item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative
                        ${isActive
                          ? 'text-white'
                          : 'text-indigo-200/70 hover:text-white hover:bg-white/[0.07]'
                        }`}
                      style={isActive ? {
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.8) 0%, rgba(124,58,237,0.6) 100%)',
                        boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                      } : {}}
                    >
                      <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-indigo-300/70 group-hover:text-indigo-200'}`} strokeWidth={isActive ? 2.2 : 1.8} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {isActive && !collapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User & Logout */}
      <div className="shrink-0 p-2.5 border-t border-white/10 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5">
            <div className="grid place-items-center w-8 h-8 rounded-full shrink-0 text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{name || 'Pengguna'}</p>
              {role && <p className="text-[10px] text-indigo-300/70 capitalize">{role}{isSuper ? ' · super' : ''}</p>}
            </div>
          </div>
        )}
        <button
          onClick={() => {
            if (window.confirm('Apakah Anda yakin ingin keluar?')) logout()
          }}
          title="Keluar"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-indigo-200/60 hover:bg-red-500/20 hover:text-red-300 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </aside>
  )
}
