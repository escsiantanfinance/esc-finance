import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Role yang boleh dibuat admin — TIDAK pernah 'admin' atau super admin.
const ALLOWED_ROLES = ['bendahara', 'majelis', 'volunteer']

async function requireAdmin() {
  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi', status: 401 as const }
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'admin') return { error: 'Hanya Admin yang boleh mengelola pengguna', status: 403 as const }
  return { ok: true as const, uid: user.id }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!('ok' in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const admin = createSupabaseAdmin()
  const { data: list } = await admin.auth.admin.listUsers()
  const { data: profiles } = await admin.from('profiles').select('id, full_name, role, is_super_admin, boleh_approve_pengeluaran, is_active')
  const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]))
  const users = (list?.users ?? []).map((u: any) => {
    const p = pmap.get(u.id) ?? {}
    return { id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, ...p }
  }).sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1))
  return NextResponse.json({ users })
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!('ok' in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { email, password, full_name, role } = await req.json().catch(() => ({}))
  if (!email || !password || String(password).length < 6)
    return NextResponse.json({ error: 'Email & kata sandi (min. 6 karakter) wajib diisi' }, { status: 400 })
  if (!ALLOWED_ROLES.includes(role))
    return NextResponse.json({ error: 'Role harus Bendahara, Majelis, atau Volunteer' }, { status: 400 })

  const admin = createSupabaseAdmin()
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: full_name || email, role },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  // Pastikan role & non-super (kalau trigger pakai default)
  await admin.from('profiles').update({ role, full_name: full_name || email, is_super_admin: false }).eq('id', data.user!.id)
  return NextResponse.json({ ok: true, id: data.user!.id })
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin()
  if (!('ok' in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id, role, boleh_approve_pengeluaran } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

  const admin = createSupabaseAdmin()
  // Lindungi akun Admin / Super Admin dari perubahan lewat panel ini.
  const { data: target } = await admin.from('profiles').select('is_super_admin, role').eq('id', id).single()
  if (target?.is_super_admin || target?.role === 'admin')
    return NextResponse.json({ error: 'Akun Admin / Super Admin tidak bisa diubah di sini' }, { status: 403 })

  const patch: Record<string, any> = {}
  if (role !== undefined) {
    if (!ALLOWED_ROLES.includes(role))
      return NextResponse.json({ error: 'Role harus Bendahara, Majelis, atau Volunteer' }, { status: 400 })
    patch.role = role
  }
  if (boleh_approve_pengeluaran !== undefined) patch.boleh_approve_pengeluaran = !!boleh_approve_pengeluaran
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 })

  const { error } = await admin.from('profiles').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin()
  if (!('ok' in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
  if (id === auth.uid) return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })
  const admin = createSupabaseAdmin()
  // Lindungi: jangan hapus super admin
  const { data: target } = await admin.from('profiles').select('is_super_admin, role').eq('id', id).single()
  if (target?.is_super_admin || target?.role === 'admin')
    return NextResponse.json({ error: 'Tidak bisa menghapus akun Admin / Super Admin' }, { status: 403 })
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
