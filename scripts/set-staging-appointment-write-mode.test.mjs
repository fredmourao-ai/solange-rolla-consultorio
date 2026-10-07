import { describe, expect, it } from 'vitest'
import { setStagingAppointmentWriteMode, writeModeSql } from './set-staging-appointment-write-mode.mjs'

function response(payload) {
  return {
    ok: true,
    status: 200,
    async text() { return JSON.stringify(payload) },
  }
}

function verificationRow(mode) {
  const legacy = mode === 'legacy-compatible'
  return [{
    appointments_insert: legacy,
    appointments_update: legacy,
    appointments_delete: false,
    history_insert: legacy,
    history_update: false,
    history_delete: false,
  }]
}

describe('staging appointment write-mode bridge', () => {
  it.each(['legacy-compatible', 'atomic-only'])('applies and verifies %s mode against staging only', async (mode) => {
    const calls = []
    const fetchImpl = async (_url, init) => {
      calls.push(JSON.parse(init.body))
      return response(calls.length === 1 ? [] : verificationRow(mode))
    }
    await expect(setStagingAppointmentWriteMode({
      projectRef: 'staging-ref',
      productionRef: 'production-ref',
      accessToken: 'synthetic-token',
      mode,
      fetchImpl,
    })).resolves.toEqual(mode === 'legacy-compatible'
      ? { appointmentsInsert: true, appointmentsUpdate: true, appointmentsDelete: false, historyInsert: true, historyUpdate: false, historyDelete: false }
      : { appointmentsInsert: false, appointmentsUpdate: false, appointmentsDelete: false, historyInsert: false, historyUpdate: false, historyDelete: false })

    expect(calls).toHaveLength(2)
    expect(calls[0].query).toBe(writeModeSql(mode))
    expect(calls[0].read_only).toBe(false)
    expect(calls[1].read_only).toBe(true)
  })

  it('refuses to mutate the production project', async () => {
    await expect(setStagingAppointmentWriteMode({
      projectRef: 'same-ref',
      productionRef: 'same-ref',
      accessToken: 'synthetic-token',
      mode: 'atomic-only',
      fetchImpl: async () => response([]),
    })).rejects.toThrow(/production/)
  })
})
