import { describe, expect, it } from 'vitest'
import { createCapabilityRevocationRepository } from './revocation-repository'


describe('capability revocation repository', () => {
  it('revokes only the requested capability', async () => {
    const updates: unknown[] = []
    const client = {
      from: () => ({
        update: (value: unknown) => ({
          eq: async (_column: string, id: string) => {
            updates.push({ value, id })
            return { error: null }
          },
        }),
      }),
    }
    const repository = createCapabilityRevocationRepository(client as never)
    await expect(repository.revoke('cap-1')).resolves.toBeUndefined()
    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({ id: 'cap-1' })
  })
})
