import { describe, expect, it } from 'vitest'
import { sendBirthdayGreetings } from './send-birthday-greetings'

describe('birthday automation', () => {
  it('selects birthdays by Sao Paulo date and emits one yearly idempotency key', async () => {
    const keys: string[] = []
    const count = await sendBirthdayGreetings({
      now: new Date('2026-08-27T02:30:00.000Z'),
      people: [{ id: 'p1', preferredName: 'Pessoa Fictícia', birthDate: '1990-08-26', enabled: true, channel: 'email' }],
      enqueue: async (message) => { keys.push(message.idempotencyKey); return true },
    })
    expect(count).toBe(1)
    expect(keys).toEqual(['birthday:p1:2026'])
  })

  it('does not select disabled birthday messaging', async () => {
    expect(await sendBirthdayGreetings({ now: new Date('2026-08-26T15:00:00.000Z'), people: [{ id: 'p1', preferredName: 'Pessoa', birthDate: '1990-08-26', enabled: false, channel: 'email' }], enqueue: async () => true })).toBe(0)
  })
})
