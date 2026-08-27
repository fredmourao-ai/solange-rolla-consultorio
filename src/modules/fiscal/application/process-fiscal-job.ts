import { classifyNfseError, type NfseProvider } from './nfse-provider'
import { transitionFiscalDocument, type FiscalDocument } from '../domain/fiscal-document'

export type FiscalJobRepository = {
  recordAttempt(status: 'started' | 'succeeded' | 'retryable_failure' | 'final_failure'): Promise<void>
  update(document: FiscalDocument): Promise<FiscalDocument>
}

export type FiscalProviderSnapshot = {
  issuerDocument: string
  serviceCode: string
  payerDocument: string
  correlationId: string
}

export async function processFiscalJob(
  document: FiscalDocument,
  snapshot: FiscalProviderSnapshot,
  repository: FiscalJobRepository,
  provider: NfseProvider,
): Promise<FiscalDocument> {
  const processing = transitionFiscalDocument(document, 'processing')
  await repository.update(processing)
  await repository.recordAttempt('started')

  try {
    const result = await provider.issue({
      idempotencyKey: document.idempotencyKey,
      sourceType: document.sourceType,
      sourceId: document.sourceId,
      amountCents: document.amountCents,
      issuerDocument: snapshot.issuerDocument,
      serviceCode: snapshot.serviceCode,
      payerDocument: snapshot.payerDocument,
      correlationId: snapshot.correlationId,
    })
    const issued = result.status === 'processing'
      ? processing
      : transitionFiscalDocument(processing, 'issued')
    const updated = await repository.update({
      ...issued,
      externalId: result.externalId,
      protocol: result.protocol,
      issuedAt: result.status === 'issued' ? new Date().toISOString() : undefined,
    })
    await repository.recordAttempt('succeeded')
    return updated
  } catch (error) {
    const kind = classifyNfseError(error)
    const status = kind === 'final' ? 'failed_final' : 'failed_retryable'
    const failed = transitionFiscalDocument(processing, status)
    await repository.update(failed)
    await repository.recordAttempt(kind === 'final' ? 'final_failure' : 'retryable_failure')
    return failed
  }
}
