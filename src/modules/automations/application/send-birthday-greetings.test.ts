import { describe, expect, it } from 'vitest'
import { sendBirthdayGreetings, type BirthdayMessage } from './send-birthday-greetings'

describe('birthday automation', () => {
  it('selects birthdays by Sao Paulo date and emits one yearly idempotency key to the real recipient', async () => {
    const messages: BirthdayMessage[] = []
    const count = await sendBirthdayGreetings({
      now: new Date('2026-08-27T02:30:00.000Z'),
      people: [{ id: 'p1', preferredName: 'Pessoa Fictícia', birthDate: '1990-08-26', enabled: true, channel: 'email', recipient: 'test@example.com' }],
      enqueue: async (message) => { messages.push(message); return true },
    })
    expect(count).toBe(1)
    expect(messages).toEqual([{
      idempotencyKey: 'birthday:p1:2026-08-26:birthday_greeting',
      recipient: 'test@example.com',
      channel: 'email',
      templateKey: 'birthday_greeting',
      payload: { preferredName: 'Pessoa Fictícia' },
    }])
  })

  it('does not select disabled birthday messaging', async () => {
    expect(await sendBirthdayGreetings({ now: new Date('2026-08-26T15:00:00.000Z'), people: [{ id: 'p1', preferredName: 'Pessoa', birthDate: '1990-08-26', enabled: false, channel: 'email', recipient: 'test@example.com' }], enqueue: async () => true })).toBe(0)
  })

  it('does not enqueue when the selected channel has no recipient', async () => {
    expect(await sendBirthdayGreetings({ now: new Date('2026-08-26T15:00:00.000Z'), people: [{ id: 'p1', preferredName: 'Pessoa', birthDate: '1990-08-26', enabled: true, channel: 'email', recipient: '' }], enqueue: async () => true })).toBe(0)
  })

  it('does not count an idempotent re-execution when enqueue reports duplicate', async () => {
    expect(await sendBirthdayGreetings({ now: new Date('2026-08-26T15:00:00.000Z'), people: [{ id: 'p1', preferredName: 'Pessoa', birthDate: '1990-08-26', enabled: true, channel: 'whatsapp', recipient: '+5531999999999' }], enqueue: async () => false })).toBe(0)
  })
})
