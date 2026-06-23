'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      const msg = error.message || ''
      if (/fetch|network|Failed to fetch|ENOTFOUND/i.test(msg)) {
        setError('Tidak bisa terhubung ke server Supabase. Cek NEXT_PUBLIC_SUPABASE_URL di .env.local (jangan placeholder), lalu restart server.')
      } else if (/not confirmed/i.test(msg)) {
        setError('Email belum dikonfirmasi. Di Supabase → Authentication → Users, aktifkan/konfirmasi user (Auto Confirm).')
      } else if (/invalid login/i.test(msg)) {
        setError('Email atau kata sandi salah.')
      } else {
        setError(msg)
      }
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="flex w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Panel kiri */}
        <div className="hidden md:flex flex-col justify-center w-2/5 bg-blue-800 text-white p-10">
          <div className="text-5xl">⛪</div>
          <h1 className="text-2xl font-bold mt-4 leading-tight">ESC Siantan Finance</h1>
          <p className="text-blue-200 text-sm mt-2">Sistem Akuntansi &amp; Bendahara Gereja Terintegrasi</p>
          <ul className="text-blue-100 text-sm mt-8 space-y-2">
            <li>✓ Rekonsiliasi kas otomatis</li>
            <li>✓ Laporan keuangan standar</li>
            <li>✓ Aman &amp; tercadangkan harian</li>
          </ul>
        </div>
        {/* Form */}
        <div className="flex-1 p-10">
          <h2 className="text-xl font-bold text-gray-900">Masuk ke akun Anda</h2>
          <p className="text-gray-500 text-sm mt-1 mb-6">Khusus pengurus &amp; bendahara gereja</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="bendahara@gereja.id"
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Kata sandi</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition-colors">
              {loading ? 'Memproses…' : 'Masuk'}
            </button>
          </form>
          <p className="text-center text-gray-400 text-xs mt-6">🔒 Koneksi aman terenkripsi</p>
        </div>
      </div>
    </div>
  )
}
