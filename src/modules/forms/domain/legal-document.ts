export const LEGAL_DOCUMENT_KEYS = [
  'service_terms',
  'cancellation_policy',
  'truthfulness_declaration',
  'privacy_notice',
] as const

export type LegalDocumentKey = (typeof LEGAL_DOCUMENT_KEYS)[number]

export type LegalDocumentVersion = {
  id: string
  key: LegalDocumentKey
  version: number
  content: string
  contentHash: string
  effectiveFrom: string
  supersedesId?: string
}

export type LegalAcceptance = {
  personId: string
  documentVersionId: string
  contentHash: string
  acceptedAt: string
  channel: 'web' | 'staff' | 'capability'
}

export function activateLegalDocument(
  previous: LegalDocumentVersion,
  next: LegalDocumentVersion,
): LegalDocumentVersion {
  if (next.key !== previous.key || next.version !== previous.version + 1) {
    throw new Error('INVALID_LEGAL_DOCUMENT_VERSION')
  }
  return { ...next, supersedesId: previous.id }
}

export function acceptLegalDocument(
  document: LegalDocumentVersion,
  personId: string,
  channel: LegalAcceptance['channel'],
  acceptedAt = new Date().toISOString(),
): LegalAcceptance {
  return {
    personId,
    documentVersionId: document.id,
    contentHash: document.contentHash,
    acceptedAt,
    channel,
  }
}
