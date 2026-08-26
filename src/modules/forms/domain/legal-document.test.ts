import { describe, expect, it } from 'vitest'
import { acceptLegalDocument, activateLegalDocument, type LegalDocumentVersion } from './legal-document'

const version1: LegalDocumentVersion = {
  id: 'terms-v1', key: 'service_terms', version: 1, content: 'Texto 1',
  contentHash: 'hash-1', effectiveFrom: '2026-01-01T00:00:00.000Z',
}

describe('versioned legal documents', () => {
  it('keeps an accepted version unchanged when a new version is activated', () => {
    const accepted = acceptLegalDocument(version1, 'person-1', 'web')
    const version2 = activateLegalDocument(version1, {
      id: 'terms-v2', key: version1.key, version: 2, content: 'Texto 2',
      contentHash: 'hash-2', effectiveFrom: '2026-02-01T00:00:00.000Z',
    })

    expect(accepted.documentVersionId).toBe(version1.id)
    expect(accepted.contentHash).toBe(version1.contentHash)
    expect(version2.supersedesId).toBe(version1.id)
  })
})
