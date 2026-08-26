import { describe, expect, it } from 'vitest'
import { matchDuplicate } from './find-duplicates'

describe('matchDuplicate', () => {
  it('treats same normalized CPF as a hard duplicate', () => {
    expect(
      matchDuplicate(
        { cpfNormalized: '52998224725', emailNormalized: 'old@example.test', phoneE164: '+5531987654321' },
        { cpfNormalized: '52998224725', emailNormalized: 'new@example.test', phoneE164: '+5531999999999' },
      ),
    ).toEqual({ kind: 'hard', reason: 'cpf' })
  })

  it('returns a warning for matching email or phone without matching CPF', () => {
    expect(
      matchDuplicate(
        { cpfNormalized: null, emailNormalized: 'old@example.test', phoneE164: '+5531987654321' },
        { cpfNormalized: null, emailNormalized: 'old@example.test', phoneE164: '+5531999999999' },
      ),
    ).toEqual({ kind: 'warning', reason: 'email' })
  })
})
