import { describe, expect, it } from 'vitest'
import { parseClientEnv, parseServerEnv } from './schema'

const validServerEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
  APP_URL: 'http://localhost:3000',
  APP_ENV: 'test',
  CLINICAL_ENCRYPTION_KEY_V1: 'test-encryption-key',
  CLINICAL_ENCRYPTION_ACTIVE_VERSION: '1',
  RATE_LIMIT_HMAC_KEY: 'a'.repeat(32),
  WHATSAPP_LIVE_ENABLED: 'false',
  NFSE_LIVE_ENABLED: 'true',
}

describe('server environment contract', () => {
  it('accepts preview as an explicit environment', () => {
    expect(parseServerEnv({ ...validServerEnv, APP_ENV: 'preview' }).APP_ENV).toBe('preview')
  })

  it.each(['', 'prod', 'development', 'unknown'])('rejects invalid APP_ENV value %j', (APP_ENV) => {
    expect(() => parseServerEnv({ ...validServerEnv, APP_ENV })).toThrow(/APP_ENV/)
  })

  it('rejects missing server secrets', () => {
    expect(() => parseServerEnv({})).toThrow(/SUPABASE_SECRET_KEY/)
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
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    })
    expect('SUPABASE_SECRET_KEY' in parsed).toBe(false)
  })

  it('rejects legacy API key names', () => {
    expect(() =>
      parseServerEnv({
        ...validServerEnv,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
        SUPABASE_SECRET_KEY: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'legacy-anon',
        SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role',
      }),
    ).toThrow()
  })
})
