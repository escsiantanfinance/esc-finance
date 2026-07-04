'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Church, ShieldCheck, TrendingUp, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
        setError('Tidak bisa terhubung ke server. Periksa koneksi internet Anda.')
      } else if (/not confirmed/i.test(msg)) {
        setError('Email belum dikonfirmasi. Hubungi administrator.')
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
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #fdf4ff 100%)' }}>

      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20 blur-3xl -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-15 blur-3xl translate-x-1/2 translate-y-1/2"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />

      <div className="relative w-full max-w-4xl flex bg-white rounded-3xl overflow-hidden animate-slideup"
        style={{ boxShadow: '0 32px 80px rgba(79,70,229,0.18)' }}>

        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between w-5/12 p-10 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #4f46e5 55%, #7c3aed 100%)' }}>
          {/* Decorative circle */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, white, transparent)' }} />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />

          <div className="relative z-10">
            <div className="grid place-items-center w-14 h-14 rounded-2xl mb-6"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
              <Church className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold leading-tight mb-2">ESC Finance</h1>
            <p className="text-indigo-200 text-sm">Sistem Akuntansi & Bendahara Gereja Terintegrasi</p>
          </div>

          <div className="relative z-10 space-y-4">
            {[
              { icon: TrendingUp, text: 'Rekonsiliasi kas otomatis' },
              { icon: ShieldCheck, text: 'Laporan keuangan standar gereja' },
              { icon: Lock, text: 'Data aman & tercadangkan harian' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="grid place-items-center w-7 h-7 rounded-lg shrink-0"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-indigo-100">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 p-10 flex flex-col justify-center">
          <div className="md:hidden grid place-items-center w-12 h-12 rounded-2xl mb-6 mx-auto"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <Church className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Masuk ke akun Anda</h2>
          <p className="text-gray-400 text-sm mt-1 mb-8">Khusus pengurus &amp; bendahara gereja</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                type="email" required value={email} autoFocus
                autoComplete="email" disabled={loading}
                onChange={e => setEmail(e.target.value)}
                placeholder="bendahara@gereja.id"
                className="form-input disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="password" className="form-label">Kata Sandi</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'} required value={password}
                  autoComplete="current-password" disabled={loading}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pr-11 disabled:opacity-60"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>
            {error && (
              <div role="alert" aria-live="polite"
                className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-fadein">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Memproses…</span>
              ) : 'Masuk'}
            </button>
          </form>

          <div className="flex items-center gap-2 justify-center mt-8 text-xs text-gray-400">
            <Lock className="w-3 h-3" />
            <span>Koneksi aman terenkripsi dengan SSL</span>
          </div>
        </div>
      </div>
    </div>
  )
}
