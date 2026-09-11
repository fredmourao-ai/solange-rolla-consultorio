import { describe, expect, it } from 'vitest'
import { requireRoleForTest } from './require-role'

describe('requireRoleForTest', () => {
  it('rejects an allowed role when aal2 is required but session is aal1', async () => {
    await expect(
      requireRoleForTest(
        {
          userId: 'user-1',
          role: 'psychologist_owner',
          aal: 'aal1',
          active: true,
          permissions: [],
        },
        ['psychologist_owner'],
        { aal2: true },
      ),
    ).rejects.toThrow('MFA_REQUIRED')
  })

  it('rejects inactive staff even when the role is allowed', async () => {
    await expect(
      requireRoleForTest(
        { userId: 'user-1', role: 'secretary', aal: 'aal2', active: false, permissions: [] },
        ['secretary'],
      ),
    ).rejects.toThrow('STAFF_INACTIVE')
  })

  it('returns an active allowed staff session', async () => {
    await expect(
      requireRoleForTest(
        { userId: 'user-1', role: 'accounting', aal: 'aal2', active: true, permissions: [] },
        ['accounting'],
      ),
    ).resolves.toMatchObject({ role: 'accounting' })
  })
})
