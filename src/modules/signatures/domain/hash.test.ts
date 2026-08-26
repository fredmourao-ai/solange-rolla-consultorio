import { describe, expect, it } from 'vitest'
import { hashCanonical } from './hash'

describe('signature canonical hash', () => {
  it('is independent of object key insertion order', () => {
    expect(hashCanonical({ a: 1, b: 2 })).toBe(hashCanonical({ b: 2, a: 1 }))
  })

  it('preserves array order and returns a SHA-256 digest', () => {
    expect(hashCanonical({ values: ['a', 'b'] })).not.toBe(hashCanonical({ values: ['b', 'a'] }))
    expect(hashCanonical({ a: 1 })).toMatch(/^[a-f0-9]{64}$/)
  })
})
