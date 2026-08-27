import { describe, expect, it } from 'vitest'
import { MockNfseProvider } from './mock-nfse-provider'

describe('MockNfseProvider', () => {
  it('returns stable synthetic identifiers for an idempotent issue', async () => {
    const provider = new MockNfseProvider()
    const request = {
      idempotencyKey: 'appointment-1:3:2',
      sourceType: 'appointment_completed' as const,
      sourceId: 'appointment-1',
      amountCents: 15000,
      issuerDocument: '12345678901',
      serviceCode: '1.01',
      payerDocument: '98765432100',
      correlationId: 'correlation-1',
    }

    const first = await provider.issue(request)
    const second = await provider.issue(request)

    expect(second).toEqual(first)
    expect(first.synthetic).toBe(true)
    expect(first.externalId).toMatch(/^mock-nfse-/)
    expect(first.protocol).toMatch(/^mock-protocol-/)
  })
})
