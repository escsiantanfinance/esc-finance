import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { parseBackupXlsx, restoreFromParsed } from '@/lib/backup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_super_admin, full_name').eq('id', user.id).single()
  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Hanya Super Admin yang dapat memulihkan data' }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get('file') as File | null
  const confirm = form.get('confirm') === 'true'
  if (!file) return NextResponse.json({ error: 'File .xlsx tidak ditemukan' }, { status: 400 })

  let parsed: Record<string, any[]>
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    parsed = parseBackupXlsx(buf)
  } catch (e: any) {
    return NextResponse.json({ error: 'Gagal membaca file: ' + e.message }, { status: 400 })
  }

  // Pratinjau: kembalikan jumlah baris per tabel untuk konfirmasi
  const preview = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, v.length]))
  if (!confirm) {
    return NextResponse.json({ ok: true, mode: 'preview', preview })
  }

  // Eksekusi restore
  try {
    const admin = createSupabaseAdmin()
    const summary = await restoreFromParsed(admin, parsed)
    await admin.from('log_restore').insert({
      dijalankan_oleh: user.id, nama_pelaksana: profile.full_name ?? 'Admin',
      file_sumber: file.name, ringkasan: summary, status: 'sukses',
    })
    return NextResponse.json({ ok: true, mode: 'restored', summary })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
