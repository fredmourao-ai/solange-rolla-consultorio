import { describe, expect, it } from 'vitest'
import { createMockProvider } from './mock-provider'

describe('mock messaging provider', () => {
  it('records a provider-ready administrative message', async () => {
    const provider = createMockProvider()
    await provider.send({ channel: 'email', recipient: 'x@example.test', body: 'Horário confirmado', idempotencyKey: 'appointment:1' })
    expect(provider.sent).toHaveLength(1)
    expect(provider.sent[0].idempotencyKey).toBe('appointment:1')
  })
})
