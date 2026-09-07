import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const config = readFileSync('supabase/config.toml', 'utf8')

describe('local Supabase MFA configuration', () => {
  it('enables TOTP enrollment and verification for clinical AAL2 flows', () => {
    expect(config).toMatch(/\[auth\.mfa\.totp\][\s\S]*?enroll_enabled\s*=\s*true/)
    expect(config).toMatch(/\[auth\.mfa\.totp\][\s\S]*?verify_enabled\s*=\s*true/)
  })
})
