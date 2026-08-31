export type CapabilitySessionRecord = {
  id: string
  purpose: string
  subjectType: 'appointment' | 'form_submission'
  subjectId: string
  expiresAt: string
  usedAt: string | null
  revokedAt: string | null
}

export type CapabilitySessionRepository = {
  findById(id: string): Promise<CapabilitySessionRecord | null>
}

export type CapabilitySessionScope = {
  purpose?: string
  subjectType?: CapabilitySessionRecord['subjectType']
  now?: Date
}

export async function loadCapabilitySession(
  capabilityId: string,
  repository: CapabilitySessionRepository,
  scope: CapabilitySessionScope = {},
): Promise<CapabilitySessionRecord | null> {
  if (!capabilityId) return null
  const record = await repository.findById(capabilityId)
  if (!record || !record.usedAt || record.revokedAt) return null
  const now = scope.now ?? new Date()
  if (new Date(record.expiresAt).getTime() <= now.getTime()) return null
  if (scope.purpose && record.purpose !== scope.purpose) return null
  if (scope.subjectType && record.subjectType !== scope.subjectType) return null
  return record
}
