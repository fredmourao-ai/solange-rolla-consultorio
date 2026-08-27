import { describe, expect, it } from 'vitest'
import { MockNfseProvider } from '../../src/modules/fiscal/infrastructure/mock-nfse-provider'
import { NationalNfseProvider } from '../../src/modules/fiscal/infrastructure/national-nfse-provider'

const request = {
  idempotencyKey: 'appointment-1:1:1',
  sourceType: 'appointment_completed' as const,
  sourceId: 'appointment-1',
  amountCents: 15000,
  issuerDocument: '12345678901',
  serviceCode: '1.01',
  payerDocument: '98765432100',
  correlationId: 'correlation-1',
}

describe('NFS-e provider contract', () => {
  it('issues, queries and cancels with the mock provider', async () => {
    const provider = new MockNfseProvider()
    const issued = await provider.issue(request)
    expect(await provider.getStatus(issued.externalId)).toMatchObject({ status: 'issued' })
    expect(await provider.cancel({
      idempotencyKey: 'cancel:appointment-1:1',
      externalId: issued.externalId,
      reason: 'synthetic test',
      correlationId: 'correlation-1',
    })).toMatchObject({ status: 'cancelled' })
  })

  it('keeps the national adapter restricted until live credentials are enabled', async () => {
    const provider = new NationalNfseProvider({ liveEnabled: false })
    await expect(provider.issue(request)).rejects.toThrow('NFSE_LIVE_DISABLED')
  })
})
