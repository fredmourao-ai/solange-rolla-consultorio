import { describe, expect, it } from 'vitest'
import { createCapabilityMaterial } from './token'
import { exchangeCapability } from './exchange'

describe('capability exchange', () => {
  it('consumes a valid capability once and never exposes the raw token', async () => {
    const material = createCapabilityMaterial()
    const calls: Array<Record<string, unknown>> = []
    const record = { id: 'cap-1', purpose: 'form_fill', subjectType: 'form_submission' as const, subjectId: 'submission-1', expiresAt: '2026-08-27T13:00:00Z' }
    const repository = {
      consume: async (tokenHash: string, purpose: string) => {
        calls.push({ tokenHash, purpose })
        return tokenHash === material.tokenHash && purpose === 'form_fill' ? record : null
      },
    }

    await expect(exchangeCapability(material.rawToken, 'form_fill', repository, new Date('2026-08-27T12:00:00Z'))).resolves.toEqual(record)
    expect(calls[0]).toEqual({ tokenHash: material.tokenHash, purpose: 'form_fill' })
    expect(JSON.stringify(calls)).not.toContain(material.rawToken)
    await expect(exchangeCapability(material.rawToken, 'appointment_confirm', repository)).resolves.toBeNull()
  })
})
