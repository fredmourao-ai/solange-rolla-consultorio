import { describe, expect, it } from 'vitest'
import { isTrustedOrigin, requireTrustedOrigin } from './origin'

describe('trusted origins', () => {
  it('accepts the configured application origin and rejects lookalikes', () => {
    expect(isTrustedOrigin('https://consultorio.example.test', ['https://consultorio.example.test'])).toBe(true)
    expect(isTrustedOrigin('https://consultorio.example.test.attacker.test', ['https://consultorio.example.test'])).toBe(false)
  })

  it('requires Origin on browser-facing mutations', () => {
    expect(() => requireTrustedOrigin(new Request('https://app.test/action', { method: 'POST' }), ['https://app.test'])).toThrow('TRUSTED_ORIGIN_REQUIRED')
    expect(() => requireTrustedOrigin(new Request('https://app.test/action', { method: 'POST', headers: { Origin: 'https://evil.test' } }), ['https://app.test'])).toThrow('TRUSTED_ORIGIN_REQUIRED')
    expect(requireTrustedOrigin(new Request('https://app.test/action', { method: 'POST', headers: { Origin: 'https://app.test' } }), ['https://app.test'])).toBe('https://app.test')
  })
})
