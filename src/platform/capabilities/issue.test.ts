import { describe, expect, it, vi } from 'vitest'
import { issueCapability, type CapabilityIssuanceRepository } from './issue'
import { verifyCapabilityToken } from './token'

function repository(insert: CapabilityIssuanceRepository['insert'] = vi.fn(async () => ({ id: 'cap-1' }))): CapabilityIssuanceRepository {
  return { insert }
}

describe('issueCapability', () => {
  it('mints a raw token, persists only its hash, and returns the raw token to the caller', async () => {
    const insert = vi.fn<CapabilityIssuanceRepository['insert']>(async () => ({ id: 'cap-1' }))
    const result = await issueCapability(
      {
        purpose: 'appointment_response',
        subjectType: 'appointment',
        subjectId: 'appt-1',
        expiresAt: new Date('2026-09-05T12:00:00Z'),
        now: new Date('2026-09-03T12:00:00Z'),
      },
      repository(insert),
    )

    expect(result.id).toBe('cap-1')
    expect(result.rawToken).toEqual(expect.any(String))
    expect(insert).toHaveBeenCalledTimes(1)
    const persisted = insert.mock.calls[0][0]
    expect(persisted).toMatchObject({
      purpose: 'appointment_response',
      subjectType: 'appointment',
      subjectId: 'appt-1',
      expiresAt: '2026-09-05T12:00:00.000Z',
    })
    expect(persisted.tokenHash).not.toBe(result.rawToken)
    expect(verifyCapabilityToken(result.rawToken, persisted.tokenHash)).toBe(true)
  })

  it('rejects an expiry that is not in the future', async () => {
    await expect(
      issueCapability(
        {
          purpose: 'appointment_response',
          subjectType: 'appointment',
          subjectId: 'appt-1',
          expiresAt: new Date('2026-09-03T12:00:00Z'),
          now: new Date('2026-09-03T12:00:00Z'),
        },
        repository(),
      ),
    ).rejects.toThrow('CAPABILITY_EXPIRY_MUST_BE_FUTURE')
  })

  it('mints a fresh, unpredictable raw token on every call', async () => {
    const a = await issueCapability(
      { purpose: 'appointment_response', subjectType: 'appointment', subjectId: 'appt-1', expiresAt: new Date('2026-09-05T12:00:00Z') },
      repository(),
    )
    const b = await issueCapability(
      { purpose: 'appointment_response', subjectType: 'appointment', subjectId: 'appt-1', expiresAt: new Date('2026-09-05T12:00:00Z') },
      repository(),
    )
    expect(a.rawToken).not.toBe(b.rawToken)
  })
})
