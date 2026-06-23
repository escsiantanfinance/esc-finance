import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { runBackup, cleanupRetention } from '@/lib/backup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Dipicu Vercel Cron (lihat vercel.json). Dilindungi CRON_SECRET.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const admin = createSupabaseAdmin()
    const result = await runBackup(admin, 'otomatis', 'Sistem')
    await cleanupRetention(admin)
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
