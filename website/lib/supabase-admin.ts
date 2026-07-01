import { createClient } from '@supabase/supabase-js'

// Service-role client — HANYA boleh dipakai di server (app/api/**/route.ts).
// Melewati RLS, jadi jangan pernah diekspor ke client.
export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL     ?? 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY    ?? 'placeholder-service-role',
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
