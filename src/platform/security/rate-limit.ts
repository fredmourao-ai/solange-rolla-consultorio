import 'server-only'
import { createHmac } from 'node:crypto'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds?: number
}

export type RateLimitInput = { scope: string; limit: number; windowSeconds: number; now?: number }
export type RateLimitStore = {
  consume(key: string, input: RateLimitInput): Promise<RateLimitResult>
}

export function deriveRateLimitKey(secret: string, scope: string, subjectKey: string): string {
  return createHmac('sha256', secret).update(`${scope}:${subjectKey.trim()}`).digest('hex')
}

export function createPrivacySafeRateLimiter({ secret, store }: { secret: string; store: RateLimitStore }) {
  if (secret.length < 32) throw new Error('RATE_LIMIT_HMAC_KEY_TOO_SHORT')
  return {
    async consume(input: RateLimitInput & { subjectKey: string }): Promise<RateLimitResult> {
      if (!input.scope || input.limit < 1 || input.windowSeconds < 1) throw new Error('RATE_LIMIT_CONFIG_INVALID')
      const key = deriveRateLimitKey(secret, input.scope, input.subjectKey)
      return store.consume(key, input)
    },
  }
}

export function createInMemoryRateLimitStore(): RateLimitStore & { keys(): IterableIterator<string> } {
  const entries = new Map<string, { count: number; resetAt: number }>()
  return {
    async consume(key, input) {
      const now = input.now ?? Math.floor(Date.now() / 1000)
      const previous = entries.get(key)
      const current = !previous || previous.resetAt <= now ? { count: 0, resetAt: now + input.windowSeconds } : previous
      if (current.count >= input.limit) return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, current.resetAt - now) }
      current.count += 1
      entries.set(key, current)
      return { allowed: true, remaining: Math.max(0, input.limit - current.count) }
    },
    keys: () => entries.keys(),
  }
}

export function createSupabaseRateLimitStore(rpc: (args: Record<string, unknown>) => Promise<{ data: RateLimitResult[] | null; error: Error | null }>): RateLimitStore {
  return {
    async consume(key, input) {
      const result = await rpc({ p_rate_key: key, p_scope: input.scope, p_limit: input.limit, p_window_seconds: input.windowSeconds })
      if (result.error || !result.data?.[0]) throw result.error ?? new Error('RATE_LIMIT_STORE_UNAVAILABLE')
      return result.data[0]
    },
  }
}
