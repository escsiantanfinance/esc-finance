'use client'
import Link from 'next/link'

// Tombol aksi baris tabel (Edit/Hapus/Setujui/dst) yang konsisten di semua
// halaman: target sentuh layak, warna semantik, dan latar lembut alih-alih
// teks bergaris-bawah polos yang sebelumnya dipakai berbeda-beda per halaman.
type Variant = 'default' | 'danger' | 'success' | 'muted'

const variantClass: Record<Variant, string> = {
  default: 'text-blue-700 bg-blue-50 hover:bg-blue-100',
  danger: 'text-red-600 bg-red-50 hover:bg-red-100',
  success: 'text-green-700 bg-green-50 hover:bg-green-100',
  muted: 'text-gray-600 bg-gray-100 hover:bg-gray-200',
}

const base = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'

export function RowAction({
  children,
  onClick,
  variant = 'default',
  disabled,
  href,
  title,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: Variant
  disabled?: boolean
  href?: string
  title?: string
}) {
  const cls = `${base} ${variantClass[variant]}`
  if (href) return <Link href={href} className={cls} title={title}>{children}</Link>
  return (
    <button onClick={onClick} disabled={disabled} className={cls} title={title}>
      {children}
    </button>
  )
}

// Pembungkus baris aksi: jarak antar tombol konsisten, ganti pola
// mr-3/ml-3 manual yang sebelumnya tersebar di tiap halaman.
export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-1.5">{children}</div>
}
