import { describe, expect, it } from 'vitest'
import { createSupabaseProviderEventRepository } from './supabase-provider-event-repository'

function fakeClient(error: { code: string } | null) {
  const inserted: unknown[] = []
  const client = {
    from(table: string) {
      if (table !== 'inbox_events') throw new Error(`unexpected table ${table}`)
      return {
        async insert(values: unknown) {
          inserted.push(values)
          return { error }
        },
      }
    },
  }
  return { client, inserted }
}

describe('supabase provider event repository', () => {
  it('inserts a new inbox event and reports it as new', async () => {
    const { client, inserted } = fakeClient(null)
    const repository = createSupabaseProviderEventRepository(client as never)
    const result = await repository.insertIfNew({ provider: 'meta-whatsapp', providerEventId: 'evt-1', payload: { status: 'delivered' } })
    expect(result).toBe(true)
    expect(inserted).toEqual([{ provider: 'meta-whatsapp', provider_event_id: 'evt-1', payload: { status: 'delivered' } }])
  })

  it('reports a duplicate (provider, provider_event_id) as not new instead of throwing', async () => {
    const { client } = fakeClient({ code: '23505' })
    const repository = createSupabaseProviderEventRepository(client as never)
    const result = await repository.insertIfNew({ provider: 'meta-whatsapp', providerEventId: 'evt-1', payload: {} })
    expect(result).toBe(false)
  })

  it('rethrows a non-conflict database error', async () => {
    const { client } = fakeClient({ code: '42501' })
    const repository = createSupabaseProviderEventRepository(client as never)
    await expect(repository.insertIfNew({ provider: 'meta-whatsapp', providerEventId: 'evt-1', payload: {} })).rejects.toBeTruthy()
  })

  it('applies provider delivery status by provider message id', async () => {
    const updates: unknown[] = []
    const client = {
      from(table: string) {
        if (table === 'outbound_messages') {
          return {
            select() {
              return {
                eq() {
                  return { maybeSingle: async () => ({ data: { id: 'm1', provider_delivery_status: 'sent' }, error: null }) }
                },
              }
            },
            update(values: unknown) {
              return { eq: async () => { updates.push(values); return { error: null } } }
            },
          }
        }
        if (table === 'inbox_events') return { insert: async () => ({ error: null }) }
        throw new Error(`unexpected table ${table}`)
      },
    }
    const repository = createSupabaseProviderEventRepository(client as never)
    await expect(repository.applyDeliveryStatus?.({ messageId: 'provider-message-1', status: 'delivered' })).resolves.toBe('updated')
    expect(updates).toEqual([{ provider_delivery_status: 'delivered' }])
  })

  it('marks an asynchronously failed provider delivery as operationally failed', async () => {
    const updates: unknown[] = []
    const client = {
      from(table: string) {
        if (table === 'outbound_messages') {
          return {
            select() {
              return {
                eq() {
                  return { maybeSingle: async () => ({ data: { id: 'm1', provider_delivery_status: 'sent' }, error: null }) }
                },
              }
            },
            update(values: unknown) {
              return { eq: async () => { updates.push(values); return { error: null } } }
            },
          }
        }
        if (table === 'inbox_events') return { insert: async () => ({ error: null }) }
        throw new Error(`unexpected table ${table}`)
      },
    }
    const repository = createSupabaseProviderEventRepository(client as never)
    await expect(repository.applyDeliveryStatus?.({ messageId: 'provider-message-1', status: 'failed' })).resolves.toBe('updated')
    expect(updates).toEqual([{ provider_delivery_status: 'failed', status: 'failed' }])
  })

  it('rejects nested payload values that cannot be represented as JSON', async () => {
    const { client, inserted } = fakeClient(null)
    const repository = createSupabaseProviderEventRepository(client as never)
    await expect(repository.insertIfNew({
      provider: 'meta-whatsapp',
      providerEventId: 'evt-invalid',
      payload: { nested: { invalid: () => 'not-json' } },
    })).rejects.toThrow('PROVIDER_EVENT_PAYLOAD_NOT_JSON')
    expect(inserted).toEqual([])
  })

})
