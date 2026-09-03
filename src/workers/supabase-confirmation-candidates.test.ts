import { describe, expect, it } from 'vitest'
import { loadConfirmationCandidates } from './supabase-confirmation-candidates'

function clientReturning(data: unknown, error: unknown = null) {
  const calls: Record<string, unknown[]> = {}
  const record = (name: string, args: unknown[]) => { calls[name] = args }
  const chain = {
    select: (...args: unknown[]) => { record('select', args); return chain },
    in: (...args: unknown[]) => { record('in', args); return chain },
    gte: (...args: unknown[]) => { record('gte', args); return chain },
    lt: (...args: unknown[]) => { record('lt', args); return Promise.resolve({ data, error }) },
  }
  return { client: { from: (...args: unknown[]) => { record('from', args); return chain } }, calls }
}

const now = new Date('2026-09-03T15:00:00.000Z')

describe('loadConfirmationCandidates', () => {
  it('queries a widened lookahead window and eligible statuses, mapping person contact fields', async () => {
    const { client, calls } = clientReturning([
      {
        id: 'appt-1', starts_at: '2026-09-04T15:00:00+00:00', status: 'scheduled',
        person: { preferred_name: 'Maria', civil_name: 'Maria da Silva', phone_e164: '+5511999999999', email_normalized: null, preferred_channel: 'whatsapp' },
      },
      {
        id: 'appt-2', starts_at: '2026-09-04T16:00:00+00:00', status: 'rescheduled',
        person: { preferred_name: null, civil_name: 'João Souza', phone_e164: null, email_normalized: 'joao@example.com', preferred_channel: 'email' },
      },
    ])

    const result = await loadConfirmationCandidates(now, client as never)

    expect(calls.from).toEqual(['appointments'])
    expect(calls.in).toEqual(['status', ['scheduled', 'rescheduled']])
    expect(calls.gte).toEqual(['starts_at', new Date('2026-09-04T13:00:00.000Z').toISOString()])
    expect(calls.lt).toEqual(['starts_at', new Date('2026-09-04T17:00:00.000Z').toISOString()])

    expect(result).toEqual([
      { id: 'appt-1', startsAt: new Date('2026-09-04T15:00:00+00:00'), startsAtKey: '2026-09-04T15:00:00+00:00', status: 'scheduled', person: { preferredName: 'Maria', phoneE164: '+5511999999999', emailNormalized: null, preferredChannel: 'whatsapp' } },
      { id: 'appt-2', startsAt: new Date('2026-09-04T16:00:00+00:00'), startsAtKey: '2026-09-04T16:00:00+00:00', status: 'rescheduled', person: { preferredName: 'João Souza', phoneE164: null, emailNormalized: 'joao@example.com', preferredChannel: 'email' } },
    ])
  })

  it('fails closed on a query error instead of silently skipping confirmations', async () => {
    const { client } = clientReturning(null, { code: '42P01' })
    await expect(loadConfirmationCandidates(now, client as never)).rejects.toThrow('CONFIRMATION_CANDIDATES_READ_FAILED:42P01')
  })
})
