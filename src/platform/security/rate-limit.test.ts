import { describe, expect, it } from 'vitest'
import { createInMemoryRateLimitStore, createPrivacySafeRateLimiter, deriveRateLimitKey } from './rate-limit'

describe('privacy-safe rate limiting', () => {
  it('hashes the subject and keeps scopes independent', async () => {
    const store = createInMemoryRateLimitStore()
    const limiter = createPrivacySafeRateLimiter({ secret: 'a'.repeat(32), store })
    expect(deriveRateLimitKey('a'.repeat(32), 'public_form_save', '203.0.113.10')).not.toContain('203.0.113.10')
    expect(await limiter.consume({ scope: 'public_form_save', subjectKey: '203.0.113.10', limit: 1, windowSeconds: 60, now: 1000 })).toMatchObject({ allowed: true, remaining: 0 })
    expect(await limiter.consume({ scope: 'public_form_save', subjectKey: '203.0.113.10', limit: 1, windowSeconds: 60, now: 1001 })).toMatchObject({ allowed: false, retryAfterSeconds: 59 })
    expect(await limiter.consume({ scope: 'signature_submit', subjectKey: '203.0.113.10', limit: 1, windowSeconds: 60, now: 1001 })).toMatchObject({ allowed: true })
    expect([...store.keys()].some((key) => key.includes('203.0.113.10'))).toBe(false)
  })
})
