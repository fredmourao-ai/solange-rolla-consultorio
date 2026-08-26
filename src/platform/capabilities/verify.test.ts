import { describe, expect, it, vi } from 'vitest'
import { consumeCapability } from './verify'
import { createCapabilityMaterial } from './token'

describe('capability verification', () => {
  it('hashes the raw token and delegates atomic one-time consumption', async () => {
    const material = createCapabilityMaterial()
    const consumeActive = vi.fn().mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      purpose: 'form_fill',
      subjectType: 'form_submission',
      subjectId: '00000000-0000-0000-0000-000000000002',
      expiresAt: '2026-09-01T00:00:00.000Z',
    })

    await expect(consumeCapability(material.rawToken, 'form_fill', { consumeActive })).resolves.toMatchObject({
      purpose: 'form_fill',
    })
    expect(consumeActive).toHaveBeenCalledWith(
      material.tokenHash,
      'form_fill',
      expect.any(Date),
    )
  })

  it('returns null when the repository rejects expired, revoked, or replayed tokens', async () => {
    const material = createCapabilityMaterial()
    await expect(consumeCapability(material.rawToken, 'form_fill', {
      consumeActive: vi.fn().mockResolvedValue(null),
    })).resolves.toBeNull()
  })
})
