import { acceptLegalDocument, type LegalAcceptance, type LegalDocumentVersion } from '../domain/legal-document'

export type LegalAcceptanceRepository = {
  insert(acceptance: LegalAcceptance): Promise<LegalAcceptance>
}

export async function recordLegalAcceptance(
  document: LegalDocumentVersion,
  personId: string,
  channel: LegalAcceptance['channel'],
  repository: LegalAcceptanceRepository,
): Promise<LegalAcceptance> {
  return repository.insert(acceptLegalDocument(document, personId, channel))
}
