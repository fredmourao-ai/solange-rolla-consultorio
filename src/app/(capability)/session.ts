import 'server-only'
import { cookies } from 'next/headers'
import { CAPABILITY_COOKIE_NAME } from '@/platform/capabilities/cookie'
import { loadCapabilitySession, type CapabilitySessionScope } from '@/platform/capabilities/session'
import { createCapabilitySessionRepository } from '@/platform/capabilities/session-repository'

export async function getCapabilityPageSession(scope: CapabilitySessionScope = {}) {
  const capabilityId = (await cookies()).get(CAPABILITY_COOKIE_NAME)?.value
  if (!capabilityId) return null
  return loadCapabilitySession(capabilityId, createCapabilitySessionRepository(), scope)
}
