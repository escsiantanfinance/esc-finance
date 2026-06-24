import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Shell from '@/components/Shell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ESC Siantan Finance | Admin',
  description: 'Sistem Manajemen Keuangan ESC Siantan',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
