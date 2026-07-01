'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import { Bell, Search } from 'lucide-react'

const SECTION_LABELS: { href: string; label: string; emoji: string }[] = [
  { href: '/dashboard',    label: 'Dashboard',           emoji: '🏠' },
  { href: '/sesi-ibadah',  label: 'Sesi Ibadah',         emoji: '⛪' },
  { href: '/persembahan',  label: 'Persembahan',         emoji: '💝' },
  { href: '/pengeluaran',  label: 'Pengeluaran',         emoji: '🧾' },
  { href: '/anggaran',     label: 'Anggaran',            emoji: '📅' },
  { href: '/perpuluhan',   label: 'Perpuluhan',          emoji: '✅' },
  { href: '/akun',         label: 'Akun & Kas',          emoji: '💳' },
  { href: '/analitik-kas', label: 'Analitik Kas',        emoji: '📈' },
  { href: '/jurnal',       label: 'Jurnal Umum',         emoji: '📒' },
  { href: '/laporan',      label: 'Laporan Keuangan',    emoji: '📊' },
  { href: '/kategori',     label: 'Kategori',            emoji: '🏷️' },
  { href: '/users',        label: 'Kelola Pengguna',     emoji: '👥' },
  { href: '/backup',       label: 'Backup & Recovery',   emoji: '🗄️' },
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [today, setToday] = useState('')
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const now = new Date()
    setToday(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    const h = now.getHours()
    setGreeting(h < 12 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam')
  }, [])

  if (pathname === '/login' || pathname === '/') return <>{children}</>

  const section = SECTION_LABELS.find(s => pathname.startsWith(s.href))

  return (
    <div className="flex min-h-screen" style={{ background: '#f0f2fb' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-6 border-b border-indigo-100/60"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)' }}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm hidden sm:block">{greeting},</span>
            <span className="text-gray-600 text-sm font-semibold hidden sm:block">selamat bekerja!</span>
            {section && (
              <>
                <span className="text-gray-200 mx-1 hidden sm:block">|</span>
                <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">{section.emoji} {section.label}</span>
              </>
            )}
          </div>
          {/* Right side */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden lg:block">{today}</span>
          </div>
        </header>
        {/* Page Content */}
        <div key={pathname} className="flex-1 flex flex-col animate-fadein">
          {children}
        </div>
      </div>
    </div>
  )
}
