import { createHash } from 'node:crypto'
import { buildPrivateObjectPath } from '../../../platform/storage/private-storage'

export type DocumentArtifact = {
  storagePath: string
  sha256: string
  byteLength: number
  mediaType: 'application/pdf'
}

export type SignedDocumentSource = {
  formName: string
  formVersion: number
  declarationVersion: string
  typedName: string
  signedAt: string
  canonicalHashSha256: string
  fields: Array<{ label: string; value: unknown }>
}

export type SignedDocumentJob = {
  id: string
  evidenceId: string
  idempotencyKey: string
  status: string
  artifact: DocumentArtifact | null
}

export interface SignedDocumentRepository {
  findJob(jobId: string): Promise<SignedDocumentJob | null>
  loadSource(evidenceId: string): Promise<SignedDocumentSource>
  markReady(jobId: string, evidenceId: string, artifact: DocumentArtifact): Promise<void>
  markFailed(jobId: string, evidenceId: string, status: 'failed_retryable' | 'failed_final', errorCode: string): Promise<void>
}

type Dependencies = {
  repository: SignedDocumentRepository
  storage: { put(path: string, body: unknown, options?: { contentType?: string; upsert?: boolean }): Promise<void> }
  renderer: (input: SignedDocumentSource & { verificationCode: string }) => Promise<Uint8Array>
}

export async function renderSignedDocument(jobId: string, dependencies: Dependencies): Promise<DocumentArtifact> {
  const job = await dependencies.repository.findJob(jobId)
  if (!job) throw new Error('DOCUMENT_JOB_NOT_FOUND')
  if (job.status === 'completed' && job.artifact) return job.artifact

  let source: SignedDocumentSource
  try {
    source = await dependencies.repository.loadSource(job.evidenceId)
  } catch (error) {
    if (error instanceof Error && error.message === 'DOCUMENT_SOURCE_INTEGRITY_ERROR') {
      await dependencies.repository.markFailed(job.id, job.evidenceId, 'failed_final', 'DOCUMENT_SOURCE_INTEGRITY_ERROR')
    }
    throw error
  }

  let bytes: Uint8Array
  try {
    bytes = await dependencies.renderer({ ...source, verificationCode: job.evidenceId.slice(0, 8) })
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) throw new Error('INVALID_PDF_BUFFER')
  } catch (error) {
    await dependencies.repository.markFailed(job.id, job.evidenceId, 'failed_final', 'DOCUMENT_RENDER_FAILED')
    throw new Error('DOCUMENT_RENDER_FAILED', { cause: error })
  }

  const artifact: DocumentArtifact = {
    storagePath: buildPrivateObjectPath({ entity: 'signed', entityId: job.evidenceId, objectId: job.id, extension: 'pdf' }),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    byteLength: bytes.byteLength,
    mediaType: 'application/pdf',
  }

  try {
    await dependencies.storage.put(artifact.storagePath, bytes, { contentType: artifact.mediaType, upsert: false })
  } catch (error) {
    if (error instanceof Error && error.message === 'DOCUMENT_STORAGE_CONFLICT') {
      await dependencies.repository.markFailed(job.id, job.evidenceId, 'failed_final', 'DOCUMENT_STORAGE_CONFLICT')
      throw error
    }
    await dependencies.repository.markFailed(job.id, job.evidenceId, 'failed_retryable', 'DOCUMENT_STORAGE_FAILED')
    throw new Error('DOCUMENT_STORAGE_FAILED', { cause: error })
  }

  await dependencies.repository.markReady(job.id, job.evidenceId, artifact)
  return artifact
}
