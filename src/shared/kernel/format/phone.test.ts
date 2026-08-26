import { describe, expect, it } from 'vitest'

import { formatPhoneBR } from './phone'

describe('formatPhoneBR', () => {
  it('formats a Brazilian E.164 phone number', () => {
    expect(formatPhoneBR('+5511999998888')).toBe('(11) 99999-8888')
  })

  it('returns the original value when it is not a supported Brazilian phone', () => {
    expect(formatPhoneBR('123')).toBe('123')
  })
})
