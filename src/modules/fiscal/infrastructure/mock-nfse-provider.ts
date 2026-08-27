import { createHash } from 'node:crypto'
import type {
  NfseCancelRequest,
  NfseIssueRequest,
  NfseIssueResult,
  NfseProvider,
  NfseStatusResult,
} from '../application/nfse-provider'

export class MockNfseProvider implements NfseProvider {
  private readonly issued = new Map<string, NfseIssueResult>()

  async issue(request: NfseIssueRequest): Promise<NfseIssueResult> {
    const existing = this.issued.get(request.idempotencyKey)
    if (existing) return existing

    const digest = createHash('sha256').update(request.idempotencyKey).digest('hex').slice(0, 20)
    const result: NfseIssueResult = {
      externalId: `mock-nfse-${digest}`,
      protocol: `mock-protocol-${digest}`,
      status: 'issued',
      synthetic: true,
    }
    this.issued.set(request.idempotencyKey, result)
    return result
  }

  async getStatus(externalId: string): Promise<NfseStatusResult> {
    const result = [...this.issued.values()].find((item) => item.externalId === externalId)
    if (!result) throw new Error('MOCK_NFSE_NOT_FOUND')
    return { externalId, status: result.status }
  }

  async cancel(request: NfseCancelRequest): Promise<NfseStatusResult> {
    const result = [...this.issued.values()].find((item) => item.externalId === request.externalId)
    if (!result) throw new Error('MOCK_NFSE_NOT_FOUND')
    return { externalId: request.externalId, status: 'cancelled', protocol: result.protocol }
  }
}
