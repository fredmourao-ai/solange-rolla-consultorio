export type SignedDocumentStatus = 'pending' | 'processing' | 'ready' | 'failed_retryable' | 'failed_final'

export type SignedDocumentRecord = {
  evidenceId: string
  documentStatus: string
  storagePath: string | null
  sha256: string | null
  byteLength: number | null
}

export type SignedDocumentReadDependencies = {
  authorizeOwnerAal2(): Promise<void>
  repository: { findByEvidenceId(evidenceId: string): Promise<SignedDocumentRecord | null> }
  storage: { createShortLivedDownloadUrl(path: string): Promise<string> }
}

export type SignedDocumentAccess = {
  status: SignedDocumentStatus
  url?: string
  sha256?: string
  byteLength?: number
}

function normalizeDocumentStatus(status: string): SignedDocumentStatus {
  if (status === 'queued') return 'pending'
  if (status === 'failed') return 'failed_final'
  if (status === 'processing' || status === 'ready' || status === 'failed_retryable' || status === 'failed_final') {
    return status
  }
  throw new Error('SIGNED_DOCUMENT_STATUS_INVALID')
}

export async function getSignedDocument(
  evidenceId: string,
  dependencies: SignedDocumentReadDependencies,
): Promise<SignedDocumentAccess> {
  await dependencies.authorizeOwnerAal2()
  const record = await dependencies.repository.findByEvidenceId(evidenceId)
  if (!record) throw new Error('SIGNED_DOCUMENT_NOT_FOUND')

  const status = normalizeDocumentStatus(record.documentStatus)
  if (status !== 'ready') return { status }

  if (!record.storagePath || !record.sha256 || record.byteLength === null || record.byteLength < 0) {
    throw new Error('SIGNED_DOCUMENT_ARTIFACT_INVALID')
  }

  const url = await dependencies.storage.createShortLivedDownloadUrl(record.storagePath)
  return {
    status,
    url,
    sha256: record.sha256,
    byteLength: record.byteLength,
  }
}
