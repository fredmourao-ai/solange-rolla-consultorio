import type { FiscalSourceKind } from '../domain/fiscal-treatment'

export type NfseIssueRequest = {
  idempotencyKey: string
  sourceType: FiscalSourceKind
  sourceId: string
  amountCents: number
  issuerDocument: string
  serviceCode: string
  payerDocument: string
  correlationId: string
}

export type NfseIssueResult = {
  externalId: string
  protocol: string
  status: 'issued' | 'processing'
  synthetic: boolean
}

export type NfseStatusResult = {
  externalId: string
  status: 'processing' | 'issued' | 'cancelled' | 'failed'
  protocol?: string
}

export type NfseCancelRequest = {
  externalId: string
  reason: string
  correlationId: string
}

export interface NfseProvider {
  issue(request: NfseIssueRequest): Promise<NfseIssueResult>
  getStatus(externalId: string): Promise<NfseStatusResult>
  cancel(request: NfseCancelRequest): Promise<NfseStatusResult>
}
