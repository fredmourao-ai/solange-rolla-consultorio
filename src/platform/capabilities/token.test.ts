import { describe, expect, it } from 'vitest'
import { createCapabilityMaterial, hashCapabilityToken, verifyCapabilityToken } from './token'

describe('capability tokens', () => {
  it('stores only a one-way hash', () => {
    const { rawToken, tokenHash } = createCapabilityMaterial()
    expect(rawToken).not.toBe(tokenHash)
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('verifies the raw token without exposing it in the stored material', () => {
    const { rawToken, tokenHash } = createCapabilityMaterial()
    expect(verifyCapabilityToken(rawToken, tokenHash)).toBe(true)
    expect(verifyCapabilityToken('wrong-token', tokenHash)).toBe(false)
    expect(hashCapabilityToken(rawToken)).toBe(tokenHash)
  })
})
