'use client'

import { serverEnv } from '@/platform/env/server'

export function ClientImportsServerEnv() {
  return <output>{serverEnv().SUPABASE_SECRET_KEY}</output>
}
