import { describe, expect, it } from 'vitest'
import { createSupabaseCapabilityIssuanceRepository } from './supabase-issue-capability-repository'

describe('supabase capability issuance repository', () => {
  it('inserts the token hash (never the raw token) and returns the new id', async () => {
    let insertedRow: Record<string, unknown> | undefined
    const client = {
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          insertedRow = row
          return {
            select: () => ({
              single: async () => ({ data: { id: 'cap-1' }, error: null }),
            }),
          }
        },
      }),
    }

    const repository = createSupabaseCapabilityIssuanceRepository(client as never)
    const result = await repository.insert({
      tokenHash: 'a'.repeat(64),
      purpose: 'appointment_response',
      subjectType: 'appointment',
      subjectId: 'appt-1',
      expiresAt: '2026-09-05T12:00:00.000Z',
    })

    expect(result).toEqual({ id: 'cap-1' })
    expect(insertedRow).toEqual({
      token_hash: 'a'.repeat(64),
      purpose: 'appointment_response',
      subject_type: 'appointment',
      subject_id: 'appt-1',
      expires_at: '2026-09-05T12:00:00.000Z',
    })
  })

  it('fails closed when Supabase returns an error or no row', async () => {
    const client = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { code: '23505' } }),
          }),
        }),
      }),
    }
    const repository = createSupabaseCapabilityIssuanceRepository(client as never)
    await expect(
      repository.insert({
        tokenHash: 'a'.repeat(64),
        purpose: 'appointment_response',
        subjectType: 'appointment',
        subjectId: 'appt-1',
        expiresAt: '2026-09-05T12:00:00.000Z',
      }),
    ).rejects.toThrow('CAPABILITY_ISSUANCE_FAILED:23505')
  })
})
