import { describe, expect, it } from 'vitest'
import { loadBirthdayCandidates } from './birthday-scheduling'

function clientReturning(data: unknown, error: unknown = null) {
  const calls: Record<string, unknown[]> = {}
  const record = (name: string, args: unknown[]) => { calls[name] = args }
  const chain = {
    select: (...args: unknown[]) => { record('select', args); return chain },
    eq: (...args: unknown[]) => { record('eq', args); return Promise.resolve({ data, error }) },
  }
  return {
    client: { from: (...args: unknown[]) => { record('from', args); return chain } },
    calls,
  }
}

describe('birthday candidate loader', () => {
  it('queries opted-in people, resolves the configured channel recipient and skips unsupported contacts', async () => {
    const { client, calls } = clientReturning([
      { id: '1', preferred_name: 'Ana', civil_name: 'Ana', birth_date: '1990-09-04', birthday_messages_enabled: true, preferred_channel: 'email', email_normalized: 'ana@example.com', phone_e164: null },
      { id: '2', preferred_name: null, civil_name: 'Bia', birth_date: '1991-09-04', birthday_messages_enabled: true, preferred_channel: 'none', email_normalized: 'bia@example.com', phone_e164: null },
    ])

    const result = await loadBirthdayCandidates(client as never)
    expect(calls.from).toEqual(['people'])
    expect(calls.eq).toEqual(['birthday_messages_enabled', true])
    expect(result).toEqual([{
      id: '1',
      preferredName: 'Ana',
      birthDate: '1990-09-04',
      enabled: true,
      channel: 'email',
      recipient: 'ana@example.com',
    }])
  })

  it('fails closed with the provider error code', async () => {
    const { client } = clientReturning(null, { code: '42501' })
    await expect(loadBirthdayCandidates(client as never)).rejects.toThrow('BIRTHDAY_CANDIDATES_READ_FAILED:42501')
  })
})
