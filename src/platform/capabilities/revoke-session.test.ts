import { describe, expect, it } from 'vitest'
import { revokeCapabilitySession } from './revoke-session'


describe('revoke capability session', () => {
  it('revokes the exact capability id after a completed public flow', async () => {
    const revoked: string[] = []
    await revokeCapabilitySession('cap-1', {
      revoke: async (id) => { revoked.push(id) },
    })
    expect(revoked).toEqual(['cap-1'])
  })

  it('fails closed for an empty capability id', async () => {
    await expect(revokeCapabilitySession('', {
      revoke: async () => { throw new Error('should not run') },
    })).rejects.toThrow('CAPABILITY_ID_REQUIRED')
  })
})
