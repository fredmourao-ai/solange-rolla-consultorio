import { describe, expect, it } from 'vitest'
import { createSupabaseOutboxRepository } from './supabase-outbox-repository'

const row = {
  id: '11111111-1111-4111-8111-111111111111',
  idempotency_key: 'appointment:1:confirmation:2026-09-10T12:00:00Z',
  channel: 'whatsapp',
  recipient: '+5511999990000',
  template_key: 'appointment_confirmation',
  payload: {},
  status: 'queued',
}

function fakeClient(options: { candidates: Array<{ id: string }>; claimed: (typeof row)[] }) {
  const calls: { select: unknown[]; update: unknown[] } = { select: [], update: [] }
  const client = {
    from(table: string) {
      if (table !== 'outbound_messages') throw new Error(`unexpected table ${table}`)
      return {
        select() {
          const query = {
            eq: () => query,
            is: () => query,
            order: () => query,
            limit: async () => { calls.select.push(true); return { data: options.candidates, error: null } },
          }
          return query
        },
        update(values: Record<string, unknown>) {
          calls.update.push(values)
          const query = {
            eq: () => query,
            is: () => query,
            in: () => query,
            select: async () => ({ data: options.claimed, error: null }),
          }
          return query
        },
      }
    },
  }
  return { client, calls }
}

describe('supabase outbox repository', () => {
  it('returns an empty list without updating when there are no queued candidates', async () => {
    const { client, calls } = fakeClient({ candidates: [], claimed: [] })
    const repository = createSupabaseOutboxRepository(client as never)
    expect(await repository.claimQueued(10)).toEqual([])
    expect(calls.update).toHaveLength(0)
  })

  it('claims candidates by stamping dispatched_at and maps them to the domain shape', async () => {
    const { client } = fakeClient({ candidates: [{ id: row.id }], claimed: [row] })
    const repository = createSupabaseOutboxRepository(client as never)
    const claimed = await repository.claimQueued(10)
    expect(claimed).toEqual([{
      id: row.id, idempotencyKey: row.idempotency_key, channel: 'whatsapp',
      recipient: row.recipient, templateKey: row.template_key, payload: {}, status: 'queued',
    }])
  })

  it('excludes a candidate a concurrent claimer already dispatched (empty RETURNING set)', async () => {
    const { client } = fakeClient({ candidates: [{ id: row.id }], claimed: [] })
    const repository = createSupabaseOutboxRepository(client as never)
    expect(await repository.claimQueued(10)).toEqual([])
  })

  it('marks a message dispatched', async () => {
    const { client, calls } = fakeClient({ candidates: [], claimed: [] })
    const repository = createSupabaseOutboxRepository(client as never)
    await repository.markDispatched(row.id)
    expect(calls.update).toEqual([{ status: 'dispatched' }])
  })
})
