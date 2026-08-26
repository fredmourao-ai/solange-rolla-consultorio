import { hashCapabilityToken } from './token'

export type CapabilityRecord = {
  id: string
  purpose: string
  subjectType: 'appointment' | 'form_submission'
  subjectId: string
  expiresAt: string
}

export type CapabilityRepository = {
  consumeActive(tokenHash: string, purpose: string, now: Date): Promise<CapabilityRecord | null>
}

export async function consumeCapability(
  rawToken: string,
  purpose: string,
  repository: CapabilityRepository,
  now = new Date(),
): Promise<CapabilityRecord | null> {
  if (!rawToken || !purpose) return null
  return repository.consumeActive(hashCapabilityToken(rawToken), purpose, now)
}
