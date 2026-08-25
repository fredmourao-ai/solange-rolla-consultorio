import { describe, expect, it } from 'vitest'
import { parseServerEnv } from './schema'

describe('server environment contract', () => {
  it('rejects missing server secrets', () => {
    expect(() => parseServerEnv({})).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
  })
})
