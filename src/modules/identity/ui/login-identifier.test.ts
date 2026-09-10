import { describe, expect, it } from 'vitest'
import { normalizeLoginIdentifier } from './login-identifier'

describe('normalizeLoginIdentifier', () => {
  it('maps the temporary admin username to the synthetic admin email', () => {
    expect(normalizeLoginIdentifier('admin')).toBe('admin@solange.invalid')
  })

  it('keeps regular email addresses unchanged', () => {
    expect(normalizeLoginIdentifier('owner@example.com')).toBe('owner@example.com')
  })
})
