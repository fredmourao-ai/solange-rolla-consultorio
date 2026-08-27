import { describe, expect, it } from 'vitest'
import { redact } from './redaction'

describe('operational redaction', () => {
  it('removes sensitive keys and direct contact data while preserving safe context', () => {
    const value = redact({
      entityId: 'appointment-1',
      cpf: '12345678909',
      authorization: 'Bearer synthetic-token',
      answers: { anxiety: 'confidential' },
      nested: { clinicalNotes: 'confidential' },
      email: 'person@example.test',
      phone: '+5511999999999',
      status: 'failed_retryable',
    })

    expect(value).toEqual({
      entityId: 'appointment-1',
      cpf: '[REDACTED]',
      authorization: '[REDACTED]',
      answers: '[REDACTED]',
      nested: { clinicalNotes: '[REDACTED]' },
      email: '[REDACTED]',
      phone: '[REDACTED]',
      status: 'failed_retryable',
    })
    expect(JSON.stringify(value)).not.toContain('confidential')
    expect(JSON.stringify(value)).not.toContain('synthetic-token')
  })
})
