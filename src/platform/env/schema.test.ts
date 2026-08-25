import { describe, expect, it } from 'vitest'
import { parseClientEnv, parseServerEnv } from './schema'

const validServerEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key',
  SUPABASE_SERVICE_ROLE_KEY: 'server-secret',
  APP_URL: 'http://localhost:3000',
  APP_ENV: 'test',
  CLINICAL_ENCRYPTION_KEY_V1: 'test-encryption-key',
  WHATSAPP_LIVE_ENABLED: 'false',
  NFSE_LIVE_ENABLED: 'true',
}

describe('server environment contract', () => {
  it('rejects missing server secrets', () => {
    expect(() => parseServerEnv({})).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
  })

  it('accepts only explicit live-provider booleans', () => {
    const parsed = parseServerEnv(validServerEnv)
    expect(parsed.WHATSAPP_LIVE_ENABLED).toBe(false)
    expect(parsed.NFSE_LIVE_ENABLED).toBe(true)
    expect(() => parseServerEnv({ ...validServerEnv, NFSE_LIVE_ENABLED: 'yes' })).toThrow()
  })

  it('keeps server secrets out of the client environment', () => {
    const parsed = parseClientEnv(validServerEnv)
    expect(parsed).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key',
    })
    expect('SUPABASE_SERVICE_ROLE_KEY' in parsed).toBe(false)
  })
})
