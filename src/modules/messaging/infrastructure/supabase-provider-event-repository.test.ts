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
})
