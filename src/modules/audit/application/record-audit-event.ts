import { createAuditEvent, type CreateAuditEventInput, type AuditEvent } from '../domain/audit-event'

export type AuditEventRepository = {
  insert(event: AuditEvent): Promise<void>
}

export async function recordAuditEvent(
  input: CreateAuditEventInput,
  repository: AuditEventRepository,
): Promise<AuditEvent> {
  const event = createAuditEvent(input)
  await repository.insert(event)
  return event
}
