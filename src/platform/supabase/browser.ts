import { createBrowserClient } from '@supabase/ssr'
import { clientEnv } from '../env/client'
import type { Database } from './types'

export function createBrowserSupabaseClient() {
  const env = clientEnv()

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
}
