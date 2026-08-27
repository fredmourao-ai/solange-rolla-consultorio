import type {
  NfseCancelRequest,
  NfseIssueRequest,
  NfseIssueResult,
  NfseProvider,
  NfseStatusResult,
} from '../application/nfse-provider'

type NationalNfseProviderOptions = {
  liveEnabled: boolean
  endpoint?: string
  accessToken?: string
  fetchImpl?: typeof fetch
}

type ProviderPayload = {
  externalId?: string
  protocol?: string
  status?: NfseIssueResult['status'] | NfseStatusResult['status']
}

export class NationalNfseProvider implements NfseProvider {
  private readonly options: Required<Pick<NationalNfseProviderOptions, 'liveEnabled' | 'endpoint'>> & Pick<NationalNfseProviderOptions, 'accessToken' | 'fetchImpl'>

  constructor(options: NationalNfseProviderOptions) {
    this.options = {
      liveEnabled: options.liveEnabled,
      endpoint: options.endpoint ?? 'https://www.gov.br/nfse/api',
      accessToken: options.accessToken,
      fetchImpl: options.fetchImpl ?? fetch,
    }
  }

  async issue(request: NfseIssueRequest): Promise<NfseIssueResult> {
    this.assertLiveEnabled()
    const payload = await this.call('/documents', 'POST', request.idempotencyKey, {
      sourceType: request.sourceType,
      sourceId: request.sourceId,
      amountCents: request.amountCents,
      issuerDocument: request.issuerDocument,
      serviceCode: request.serviceCode,
      payerDocument: request.payerDocument,
    })
    if (!payload.externalId || !payload.protocol) throw new Error('NFSE_AMBIGUOUS')
    return {
      externalId: payload.externalId,
      protocol: payload.protocol,
      status: payload.status === 'processing' ? 'processing' : 'issued',
      synthetic: false,
    }
  }

  async getStatus(externalId: string): Promise<NfseStatusResult> {
    this.assertLiveEnabled()
    const payload = await this.call(`/documents/${encodeURIComponent(externalId)}`, 'GET')
    if (!payload.status) throw new Error('NFSE_AMBIGUOUS')
    return { externalId, status: payload.status, protocol: payload.protocol }
  }

  async cancel(request: NfseCancelRequest): Promise<NfseStatusResult> {
    this.assertLiveEnabled()
    const payload = await this.call(`/documents/${encodeURIComponent(request.externalId)}/cancel`, 'POST', request.idempotencyKey, { reason: request.reason })
    if (!payload.status) throw new Error('NFSE_AMBIGUOUS')
    return { externalId: request.externalId, status: payload.status, protocol: payload.protocol }
  }

  private assertLiveEnabled(): void {
    if (!this.options.liveEnabled) throw new Error('NFSE_LIVE_DISABLED')
  }

  private async call(path: string, method: 'GET' | 'POST', idempotencyKey?: string, body?: Record<string, unknown>): Promise<ProviderPayload> {
    try {
      const response = await this.options.fetchImpl!(new URL(path, this.options.endpoint).toString(), {
        method,
        headers: {
          accept: 'application/json',
          ...(body ? { 'content-type': 'application/json' } : {}),
          ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
          ...(this.options.accessToken ? { authorization: `Bearer ${this.options.accessToken}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (response.status === 429 || response.status >= 500) throw new Error('NFSE_RETRYABLE')
      if (!response.ok) throw new Error('NFSE_FINAL')
      return await response.json() as ProviderPayload
    } catch (error) {
      if (error instanceof Error && ['NFSE_RETRYABLE', 'NFSE_FINAL', 'NFSE_AMBIGUOUS'].includes(error.message)) throw error
      throw new Error('NFSE_AMBIGUOUS')
    }
  }
}
