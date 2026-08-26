import { describe, expect, it } from 'vitest'

import { formatBRLFromCents } from './money'

describe('formatBRLFromCents', () => {
  it('formats integer cents with Brazilian currency punctuation', () => {
    expect(formatBRLFromCents(30000)).toBe('R$\u00a0300,00')
    expect(formatBRLFromCents(234567889n)).toBe('R$\u00102.345.678,89'.replace('\u0010', '\u00a0'))
  })

  it('formats negative integer cents without floating point arithmetic', () => {
    expect(formatBRLFromCents(-1250n)).toBe('-R$\u00a012,50')
  })

  it('rejects fractional or unsafe numeric cents', () => {
    expect(() => formatBRLFromCents(12.5)).toThrow(RangeError)
    expect(() => formatBRLFromCents(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError)
  })
})
