import 'server-only'
import type { AuditEventRepository } from '../../audit/public'
import { recordAuditEvent } from '../../audit/public'
import type { ClinicalAttachment } from './add-clinical-attachment'

export type ClinicalAttachmentUrlStorage = {
  createSignedUrl: (objectPath: string, expiresInSeconds: number) => Promise<string>
}

export type ClinicalAttachmentReadDependencies = {
  authorizeOwnerAal2: () => Promise<void>
  storage: ClinicalAttachmentUrlStorage
  audit: AuditEventRepository
  actorUserId: string
}

export async function getClinicalAttachmentUrl(
  attachment: Pick<ClinicalAttachment, 'id' | 'recordId' | 'objectPath'>,
  dependencies: ClinicalAttachmentReadDependencies,
): Promise<string> {
  await dependencies.authorizeOwnerAal2()
  const url = await dependencies.storage.createSignedUrl(attachment.objectPath, 300)
  await recordAuditEvent({
    actorId: dependencies.actorUserId,
    action: 'clinical_attachment.viewed',
    entityType: 'clinical_attachment',
    entityId: attachment.id,
    correlationId: attachment.id,
    metadata: { recordId: attachment.recordId },
  }, dependencies.audit)
  return url
}
