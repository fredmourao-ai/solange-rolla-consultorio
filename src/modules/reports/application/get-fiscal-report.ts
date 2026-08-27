export type FiscalReportDocument = {
  id: string
  status: 'not_ready' | 'ready' | 'queued' | 'processing' | 'issued' | 'failed_retryable' | 'failed_final' | 'cancel_requested' | 'cancelled' | 'replaced'
  amountCents: number
  eligibleWithoutDocument?: boolean
}

export function getFiscalReport(input: { documents: FiscalReportDocument[] }) {
  const documents = input.documents
  const count = (status: FiscalReportDocument['status']) => documents.filter((document) => document.status === status).length
  return {
    total: documents.length,
    issued: count('issued'),
    pending: documents.filter((document) => ['not_ready', 'ready', 'queued', 'processing'].includes(document.status)).length,
    failed: documents.filter((document) => ['failed_retryable', 'failed_final'].includes(document.status)).length,
    cancelled: documents.filter((document) => ['cancel_requested', 'cancelled'].includes(document.status)).length,
    eligibleWithoutDocument: documents.filter((document) => document.eligibleWithoutDocument === true).length,
    issuedCents: documents.filter((document) => document.status === 'issued').reduce((total, document) => total + document.amountCents, 0),
  }
}
