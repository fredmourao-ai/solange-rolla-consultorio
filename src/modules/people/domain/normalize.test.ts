import { describe, expect, it } from 'vitest'
import { normalizeEmail, normalizePhoneE164BR } from './normalize'

describe('people field normalization', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  TESTE@EXAMPLE.TEST  ')).toBe('teste@example.test')
  })

  it('normalizes Brazilian phone to E.164', () => {
    expect(normalizePhoneE164BR('(31) 98765-4321')).toBe('+5531987654321')
    expect(normalizePhoneE164BR('+55 (31) 98765-4321')).toBe('+5531987654321')
  })

  it('rejects ambiguous or invalid phone numbers', () => {
    expect(() => normalizePhoneE164BR('98765-4321')).toThrow('INVALID_PHONE')
    expect(() => normalizePhoneE164BR('+14155552671')).toThrow('INVALID_PHONE')
  })
})
