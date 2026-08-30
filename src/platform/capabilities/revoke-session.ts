import 'server-only'

export type CapabilityRevocationRepository = {
  revoke(id: string): Promise<void>
}

export async function revokeCapabilitySession(
  capabilityId: string,
  repository: CapabilityRevocationRepository,
): Promise<void> {
  if (!capabilityId) throw new Error('CAPABILITY_ID_REQUIRED')
  await repository.revoke(capabilityId)
}
