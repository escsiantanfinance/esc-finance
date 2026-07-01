import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server client untuk Server Components & Route Handlers (session via cookie)
export function createSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // dipanggil dari Server Component — abaikan (cookie di-refresh oleh middleware)
          }
        },
      },
    }
  )
}
