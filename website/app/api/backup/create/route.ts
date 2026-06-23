import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { runBackup } from '@/lib/backup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_super_admin, full_name').eq('id', user.id).single()
  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Hanya Super Admin yang dapat memicu pencadangan' }, { status: 403 })
  }

  try {
    const admin = createSupabaseAdmin()
    const result = await runBackup(admin, 'manual', profile.full_name ?? 'Admin')
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
