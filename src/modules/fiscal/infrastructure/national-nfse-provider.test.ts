import { describe, expect, it } from 'vitest'
import { NationalNfseProvider } from './national-nfse-provider'

describe('NationalNfseProvider', () => {
  it('fails closed before network access when live issuance is disabled', async () => {
    let networkCalled = false
    const provider = new NationalNfseProvider({
      liveEnabled: false,
      fetchImpl: async () => {
        networkCalled = true
        throw new Error('network must not be called')
      },
    })

    await expect(provider.issue({
      idempotencyKey: 'appointment-1:1:1',
      sourceType: 'appointment_completed',
      sourceId: 'appointment-1',
      amountCents: 15000,
      issuerDocument: '12345678901',
      serviceCode: '1.01',
      payerDocument: '98765432100',
      correlationId: 'correlation-1',
    })).rejects.toThrow('NFSE_LIVE_DISABLED')
    expect(networkCalled).toBe(false)
  })
})
