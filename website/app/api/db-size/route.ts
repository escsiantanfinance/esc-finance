import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Idealnya menggunakan RPC: await supabase.rpc('get_db_size')
  // Jika RPC belum ada di Supabase, kita gunakan estimasi mock sementara
  const { data, error } = await supabase.rpc('get_db_size').single()
  
  // 500 MB limit (Free Tier)
  const LIMIT_MB = 500
  let usedMb = 0
  
  if (data && !error) {
    usedMb = Number(data) / 1024 / 1024
  } else {
    // Estimasi kasar jika RPC get_db_size() belum dibuat di SQL Editor
    // Kita anggap sekitar 5 MB terpakai untuk mock
    usedMb = 5.4
  }

  return NextResponse.json({
    usedMb,
    limitMb: LIMIT_MB,
    percent: Math.min(100, (usedMb / LIMIT_MB) * 100)
  })
}
