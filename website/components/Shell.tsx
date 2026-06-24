'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'

const SECTION_LABELS: { href: string; label: string }[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/sesi-ibadah', label: 'Sesi Ibadah' },
  { href: '/persembahan', label: 'Persembahan' },
  { href: '/pengeluaran', label: 'Pengeluaran' },
  { href: '/anggaran', label: 'Anggaran' },
  { href: '/perpuluhan', label: 'Perpuluhan' },
  { href: '/akun', label: 'Akun & Kas' },
  { href: '/jurnal', label: 'Jurnal Umum' },
  { href: '/laporan', label: 'Laporan' },
  { href: '/backup', label: 'Backup & Recovery' },
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [today, setToday] = useState('')

  useEffect(() => {
    setToday(new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
  }, [])

  // Halaman publik / standalone — tanpa shell (punya tampilan sendiri)
  if (pathname === '/login' || pathname === '/') return <>{children}</>

  const section = SECTION_LABELS.find(s => pathname.startsWith(s.href))?.label ?? ''

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-14 flex items-center justify-between px-6 bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">ESC Finance</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-700">{section}</span>
          </div>
          <div className="text-xs text-slate-400 hidden sm:block">{today}</div>
        </header>
        <div key={pathname} className="flex-1 flex flex-col animate-fadein">
          {children}
        </div>
      </div>
    </div>
  )
}
