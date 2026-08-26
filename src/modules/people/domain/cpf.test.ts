import { describe, expect, it } from 'vitest'
import { isValidCpf, normalizeCpf } from './cpf'

describe('CPF normalization', () => {
  it('normalizes and validates a synthetic CPF', () => {
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725')
    expect(isValidCpf('52998224725')).toBe(true)
  })

  it('rejects repeated digits and invalid check digits', () => {
    expect(isValidCpf('11111111111')).toBe(false)
    expect(isValidCpf('52998224724')).toBe(false)
    expect(() => normalizeCpf('123')).toThrow('INVALID_CPF')
  })
})
