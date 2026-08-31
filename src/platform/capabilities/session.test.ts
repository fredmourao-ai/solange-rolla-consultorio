import { describe, expect, it } from 'vitest'
import { loadCapabilitySession, type CapabilitySessionRecord } from './session'

const active: CapabilitySessionRecord = {
  id: 'cap-1',
  purpose: 'form_fill',
  subjectType: 'form_submission' as const,
  subjectId: 'sub-1',
  expiresAt: '2026-08-29T04:00:00.000Z',
  usedAt: '2026-08-29T02:00:00.000Z',
  revokedAt: null,
}

function repository(record = active) {
  return { findById: async () => record }
}

describe('capability session', () => {
  it('returns an exchanged, active capability with matching scope', async () => {
    await expect(loadCapabilitySession('cap-1', repository(), {
      purpose: 'form_fill', subjectType: 'form_submission', now: new Date('2026-08-29T03:00:00.000Z'),
    })).resolves.toEqual(active)
  })

  it.each([
    [{ ...active, revokedAt: '2026-08-29T02:30:00.000Z' }, 'revoked'],
    [{ ...active, expiresAt: '2026-08-29T02:59:59.000Z' }, 'expired'],
    [{ ...active, usedAt: null }, 'not exchanged'],
  ])('rejects a %s capability', async (record, _label) => {
    void _label
    await expect(loadCapabilitySession('cap-1', repository(record), {
      purpose: 'form_fill', subjectType: 'form_submission', now: new Date('2026-08-29T03:00:00.000Z'),
    })).resolves.toBeNull()
  })

  it('rejects a valid capability when its purpose or subject type does not match', async () => {
    await expect(loadCapabilitySession('cap-1', repository(), {
      purpose: 'appointment_confirm', now: new Date('2026-08-29T03:00:00.000Z'),
    })).resolves.toBeNull()
    await expect(loadCapabilitySession('cap-1', repository(), {
      subjectType: 'appointment', now: new Date('2026-08-29T03:00:00.000Z'),
    })).resolves.toBeNull()
  })
})
