import { createHash } from 'node:crypto'

export type FiscalArtifactMediaType = 'application/pdf' | 'application/xml'

export type FiscalArtifactStorage = {
  upload: (path: string, bytes: Uint8Array, contentType: FiscalArtifactMediaType) => Promise<void>
}

export type StoreFiscalArtifactInput = {
  documentId: string
  mediaType: FiscalArtifactMediaType
  bytes: Uint8Array
}

export type FiscalArtifact = {
  path: string
  mediaType: FiscalArtifactMediaType
  byteLength: number
  sha256: string
}

function artifactFileName(mediaType: FiscalArtifactMediaType): string {
  return mediaType === 'application/pdf' ? 'document.pdf' : 'document.xml'
}

function validateOpaqueDocumentId(documentId: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(documentId)) {
    throw new Error('INVALID_FISCAL_DOCUMENT_ID')
  }
}

export async function storeFiscalArtifact(
  input: StoreFiscalArtifactInput,
  storage: FiscalArtifactStorage,
): Promise<FiscalArtifact> {
  validateOpaqueDocumentId(input.documentId)

  const path = `fiscal/${input.documentId}/${artifactFileName(input.mediaType)}`
  const sha256 = createHash('sha256').update(input.bytes).digest('hex')

  await storage.upload(path, input.bytes, input.mediaType)

  return {
    path,
    mediaType: input.mediaType,
    byteLength: input.bytes.byteLength,
    sha256,
  }
}
