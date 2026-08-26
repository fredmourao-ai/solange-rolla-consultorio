import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { clientEnv } from '../env/client'

export async function updateSupabaseSession(request: NextRequest) {
  const response = NextResponse.next({ request })
  let env
  try {
    env = clientEnv()
  } catch {
    return response
  }

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  })
  await supabase.auth.getUser()
  return response
}
