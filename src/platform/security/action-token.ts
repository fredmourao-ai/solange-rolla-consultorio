import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

type ActionClaims = {
  capabilitySessionId: string
  purpose: string
  subjectId: string
  nonce: string
  expiresAt: number
}

type ActionTokenInput = Omit<ActionClaims, 'nonce' | 'expiresAt'> & {
  secret: string
  now?: Date
  ttlSeconds?: number
}

type ConsumeInput = Omit<ActionTokenInput, 'ttlSeconds'> & {
  store: { consumeOnce(nonce: string): Promise<boolean> }
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function invalid(): never {
  throw new Error('ACTION_TOKEN_INVALID')
}

export function issuePublicActionToken(input: ActionTokenInput): { token: string; expiresAt: string } {
  if (!input.secret || !input.capabilitySessionId || !input.purpose || !input.subjectId) invalid()
  const now = input.now ?? new Date()
  const expiresAt = Math.floor(now.getTime() / 1000) + (input.ttlSeconds ?? 300)
  const claims: ActionClaims = {
    capabilitySessionId: input.capabilitySessionId,
    purpose: input.purpose,
    subjectId: input.subjectId,
    nonce: randomBytes(24).toString('base64url'),
    expiresAt,
  }
  const payload = encode(JSON.stringify(claims))
  return { token: `${payload}.${sign(payload, input.secret)}`, expiresAt: new Date(expiresAt * 1000).toISOString() }
}

export async function consumePublicActionToken(token: string, input: ConsumeInput): Promise<ActionClaims> {
  const parts = token.split('.')
  if (parts.length !== 2) invalid()
  const [payload, signature] = parts
  if (!payload || !signature) invalid()
  const expected = Buffer.from(sign(payload, input.secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) invalid()

  let claims: ActionClaims
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ActionClaims
  } catch {
    invalid()
  }
  const now = Math.floor((input.now ?? new Date()).getTime() / 1000)
  if (
    !claims ||
    typeof claims !== 'object' ||
    typeof claims.capabilitySessionId !== 'string' ||
    typeof claims.purpose !== 'string' ||
    typeof claims.subjectId !== 'string' ||
    typeof claims.nonce !== 'string' ||
    !Number.isInteger(claims.expiresAt) ||
    claims.capabilitySessionId !== input.capabilitySessionId ||
    claims.purpose !== input.purpose ||
    claims.subjectId !== input.subjectId ||
    !claims.nonce ||
    claims.expiresAt <= now
  ) invalid()
  if (!(await input.store.consumeOnce(claims.nonce))) throw new Error('ACTION_TOKEN_REPLAYED')
  return claims
}
