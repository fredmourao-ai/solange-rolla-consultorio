import type { LegalDocumentKey, LegalDocumentVersion } from '../domain/legal-document'

export type LegalDocumentRepository = {
  findActive(key: LegalDocumentKey): Promise<LegalDocumentVersion | null>
}

export async function getActiveLegalDocument(
  key: LegalDocumentKey,
  repository: LegalDocumentRepository,
): Promise<LegalDocumentVersion> {
  const document = await repository.findActive(key)
  if (!document) throw new Error('LEGAL_DOCUMENT_NOT_FOUND')
  return document
}
