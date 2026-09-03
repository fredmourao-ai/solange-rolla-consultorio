import { createCapabilityMaterial } from './token'
import type { CapabilitySessionRecord } from './session'

export type IssueCapabilityInput = {
  purpose: string
  subjectType: CapabilitySessionRecord['subjectType']
  subjectId: string
  expiresAt: Date
  now?: Date
}

export type CapabilityIssuanceRecord = {
  tokenHash: string
  purpose: string
  subjectType: CapabilitySessionRecord['subjectType']
  subjectId: string
  expiresAt: string
}

export type CapabilityIssuanceRepository = {
  insert(record: CapabilityIssuanceRecord): Promise<{ id: string }>
}

export type IssuedCapability = { id: string; rawToken: string }

export async function issueCapability(
  input: IssueCapabilityInput,
  repository: CapabilityIssuanceRepository,
): Promise<IssuedCapability> {
  const now = input.now ?? new Date()
  if (input.expiresAt.getTime() <= now.getTime()) throw new Error('CAPABILITY_EXPIRY_MUST_BE_FUTURE')
  const { rawToken, tokenHash } = createCapabilityMaterial()
  const record = await repository.insert({
    tokenHash,
    purpose: input.purpose,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    expiresAt: input.expiresAt.toISOString(),
  })
  return { id: record.id, rawToken }
}
