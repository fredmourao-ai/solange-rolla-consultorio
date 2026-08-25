import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { clientEnv } from '../env/client'
import type { Database } from './types'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  const env = clientEnv()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components cannot write cookies. The auth proxy added by
            // the identity task owns session refresh and cookie propagation.
          }
        },
      },
    },
  )
}
