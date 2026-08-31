import { describe, expect, it } from 'vitest'
import { createCapabilitySessionRepository } from './session-repository'

describe('capability session repository', () => {
  it('maps the minimum session fields from Supabase', async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: 'cap-1', purpose: 'form_fill', subject_type: 'form_submission',
                subject_id: 'sub-1', expires_at: '2026-08-29T04:00:00Z',
                used_at: '2026-08-29T02:00:00Z', revoked_at: null,
              },
              error: null,
            }),
          }),
        }),
      }),
    }

    const repository = createCapabilitySessionRepository(client as never)
    await expect(repository.findById('cap-1')).resolves.toEqual({
      id: 'cap-1', purpose: 'form_fill', subjectType: 'form_submission', subjectId: 'sub-1',
      expiresAt: '2026-08-29T04:00:00Z', usedAt: '2026-08-29T02:00:00Z', revokedAt: null,
    })
  })

  it('fails closed when Supabase returns an error or no row', async () => {
    const client = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: new Error('db') }) }) }) }),
    }
    const repository = createCapabilitySessionRepository(client as never)
    await expect(repository.findById('cap-1')).resolves.toBeNull()
  })
})
