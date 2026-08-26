import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export type CapabilityMaterial = {
  rawToken: string
  tokenHash: string
}

export function hashCapabilityToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex')
}

export function createCapabilityMaterial(): CapabilityMaterial {
  const rawToken = randomBytes(32).toString('base64url')
  return { rawToken, tokenHash: hashCapabilityToken(rawToken) }
}

export function verifyCapabilityToken(rawToken: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashCapabilityToken(rawToken), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
