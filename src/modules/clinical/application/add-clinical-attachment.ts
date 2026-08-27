import 'server-only'
import { createHash } from 'node:crypto'
import { randomUUID } from 'node:crypto'

export type ClinicalAttachmentMediaType = 'application/pdf' | 'image/jpeg' | 'image/png'

export type ClinicalAttachmentStorage = {
  upload: (path: string, bytes: Uint8Array, contentType: ClinicalAttachmentMediaType) => Promise<void>
}

export type ClinicalAttachment = {
  id: string
  recordId: string
  objectPath: string
  mediaType: ClinicalAttachmentMediaType
  sizeBytes: number
  sha256: string
}

export type AddClinicalAttachmentInput = {
  recordId: string
  mediaType: ClinicalAttachmentMediaType
  bytes: Uint8Array
}

export async function addClinicalAttachment(
  input: AddClinicalAttachmentInput,
  storage: ClinicalAttachmentStorage,
  idFactory: () => string = randomUUID,
): Promise<ClinicalAttachment> {
  if (!/^[A-Za-z0-9_-]+$/.test(input.recordId)) throw new Error('INVALID_CLINICAL_RECORD_ID')

  const id = idFactory()
  const objectPath = `clinical/${input.recordId}/${id}/attachment`
  const sha256 = createHash('sha256').update(input.bytes).digest('hex')
  await storage.upload(objectPath, input.bytes, input.mediaType)

  return {
    id,
    recordId: input.recordId,
    objectPath,
    mediaType: input.mediaType,
    sizeBytes: input.bytes.byteLength,
    sha256,
  }
}
