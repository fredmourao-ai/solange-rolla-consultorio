import { describe, expect, it } from 'vitest'
import { parsePositiveMoneyToCents } from './money'

describe('parsePositiveMoneyToCents', () => {
  it('parses decimal strings exactly without Number rounding', () => {
    expect(parsePositiveMoneyToCents('300.00')).toBe(30000)
    expect(parsePositiveMoneyToCents('0,01')).toBe(1)
    expect(parsePositiveMoneyToCents('90071992547409.90')).toBe(9007199254740990)
  })

  it('rejects zero, excess precision and unsafe cent values', () => {
    for (const value of ['0', '0.00', '1.001', '-1', '90071992547409.92']) {
      expect(() => parsePositiveMoneyToCents(value)).toThrow('MONEY_INVALID')
    }
  })
})
