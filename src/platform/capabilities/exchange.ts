import { hashCapabilityToken } from './token'

export type ExchangeCapabilityRecord = {
  id: string
  purpose: string
  subjectType: 'appointment' | 'form_submission'
  subjectId: string
  expiresAt: string
}

export type CapabilityExchangeRepository = {
  consume(tokenHash: string, purpose: string, now: Date): Promise<ExchangeCapabilityRecord | null>
}

export async function exchangeCapability(
  rawToken: string,
  purpose: string,
  repository: CapabilityExchangeRepository,
  now = new Date(),
): Promise<ExchangeCapabilityRecord | null> {
  if (!rawToken || !purpose) return null
  return repository.consume(hashCapabilityToken(rawToken), purpose, now)
}
