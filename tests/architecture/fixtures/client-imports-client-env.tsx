'use client'

import { clientEnv } from '@/platform/env/client'

export function ClientImportsClientEnv() {
  return <output>{clientEnv().NEXT_PUBLIC_SUPABASE_URL}</output>
}
