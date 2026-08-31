import { describe, expect, it } from 'vitest'
import { createSupabasePublicActionNonceStore, hashPublicActionNonce } from './public-action-store'

describe('public action nonce store', () => {
  it('stores only a one-way nonce hash', async () => {
    const rows: Record<string, unknown>[] = []
    const client = {
      from: () => ({
        insert: async (row: Record<string, unknown>) => {
          rows.push(row)
          return { error: null }
        },
      }),
    }
    const store = createSupabasePublicActionNonceStore(client as never)
    await expect(store.consumeOnce('raw-nonce-example')).resolves.toBe(true)
    expect(rows[0]).toMatchObject({ nonce_hash: hashPublicActionNonce('raw-nonce-example') })
    expect(rows[0]?.expires_at).toEqual(expect.any(String))
    expect(new Date(String(rows[0]?.expires_at)).getTime()).toBeGreaterThan(Date.now())
    expect(JSON.stringify(rows)).not.toContain('raw-nonce-example')
  })

  it('returns false for a unique-key replay and throws for other database errors', async () => {
    const duplicate = createSupabasePublicActionNonceStore({
      from: () => ({ insert: async () => ({ error: { code: '23505' } }) }),
    } as never)
    await expect(duplicate.consumeOnce('same-nonce')).resolves.toBe(false)

    const unavailable = createSupabasePublicActionNonceStore({
      from: () => ({ insert: async () => ({ error: new Error('db unavailable') }) }),
    } as never)
    await expect(unavailable.consumeOnce('new-nonce')).rejects.toThrow('db unavailable')
  })
})
