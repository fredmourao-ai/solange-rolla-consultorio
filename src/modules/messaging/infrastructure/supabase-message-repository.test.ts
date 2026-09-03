import { describe, expect, it } from 'vitest'
import { createSupabaseMessageRepository } from './supabase-message-repository'

const row = {
  id: '11111111-1111-4111-8111-111111111111',
  idempotency_key: 'appointment:1:confirmation:2026-09-10T12:00:00Z',
  channel: 'whatsapp',
  recipient: '+5511999990000',
  template_key: 'appointment_confirmation',
  payload: { preferredName: 'Pessoa Sintética' },
  status: 'queued',
}

function fakeClient(options: { existing?: typeof row | null; insertConflict?: boolean } = {}) {
  let inserted: typeof row | null = null
  const client = {
    from(table: string) {
      if (table !== 'outbound_messages') throw new Error(`unexpected table ${table}`)
      return {
        select() {
          const query = {
            eq: () => query,
            maybeSingle: async () => ({ data: inserted ?? options.existing ?? null, error: null }),
          }
          return query
        },
        insert(values: Record<string, unknown>) {
          return {
            select() {
              return {
                async single() {
                  if (options.insertConflict) return { data: null, error: { code: '23505', message: 'duplicate' } }
                  inserted = { ...row, ...values } as typeof row
                  return { data: inserted, error: null }
                },
              }
            },
          }
        },
      }
    },
  }
  return { client }
}

describe('supabase message repository', () => {
  it('returns null when no message exists for the idempotency key', async () => {
    const { client } = fakeClient()
    const repository = createSupabaseMessageRepository(client as never)
    expect(await repository.findByIdempotencyKey(row.idempotency_key)).toBeNull()
  })

  it('maps an existing row to the domain shape', async () => {
    const { client } = fakeClient({ existing: row })
    const repository = createSupabaseMessageRepository(client as never)
    const found = await repository.findByIdempotencyKey(row.idempotency_key)
    expect(found).toMatchObject({ id: row.id, idempotencyKey: row.idempotency_key, channel: 'whatsapp', status: 'queued' })
  })

  it('inserts a new message and returns it mapped to the domain shape', async () => {
    const { client } = fakeClient()
    const repository = createSupabaseMessageRepository(client as never)
    const inserted = await repository.insert({
      idempotencyKey: row.idempotency_key, channel: 'whatsapp', recipient: row.recipient,
      templateKey: row.template_key, payload: row.payload,
    })
    expect(inserted).toMatchObject({ idempotencyKey: row.idempotency_key, channel: 'whatsapp', status: 'queued' })
  })

  it('finds a message by id for the worker to load before sending', async () => {
    const { client } = fakeClient({ existing: row })
    const repository = createSupabaseMessageRepository(client as never)
    expect(await repository.findById(row.id)).toMatchObject({ id: row.id, templateKey: row.template_key })
  })

  it('returns the existing row instead of throwing on a concurrent duplicate insert', async () => {
    const { client } = fakeClient({ existing: row, insertConflict: true })
    const repository = createSupabaseMessageRepository(client as never)
    const inserted = await repository.insert({
      idempotencyKey: row.idempotency_key, channel: 'whatsapp', recipient: row.recipient,
      templateKey: row.template_key, payload: row.payload,
    })
    expect(inserted.id).toBe(row.id)
  })
})
