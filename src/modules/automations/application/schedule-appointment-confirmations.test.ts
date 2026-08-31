import { describe, expect, it } from 'vitest'
import { scheduleAppointmentConfirmations } from './schedule-appointment-confirmations'

describe('appointment confirmations', () => {
  it('schedules once for an active appointment in the 24 hour window', async () => {
    const keys: string[] = []
    const result = await scheduleAppointmentConfirmations({
      now: new Date('2026-08-30T15:00:00.000Z'),
      appointments: [{ id: 'a1', startsAt: new Date('2026-08-31T15:00:00.000Z'), status: 'scheduled', startsAtKey: '2026-08-31T15:00:00.000Z' }],
      enqueue: async (key) => { keys.push(key); return keys.length === 1 },
    })
    expect(result).toBe(1)
    expect(keys).toEqual(['appointment:a1:confirmation:2026-08-31T15:00:00.000Z'])
  })
})

  it.each(['cancelled_in_time','cancelled_late','cancelled_by_provider','completed','no_show','reschedule_requested'])(
    'does not schedule terminal or non-confirmable status %s', async (status) => {
      const count = await scheduleAppointmentConfirmations({
        now: new Date('2026-08-30T15:00:00.000Z'),
        appointments: [{ id: 'a1', startsAt: new Date('2026-08-31T15:00:00.000Z'), status, startsAtKey: '2026-08-31T15:00:00.000Z' }],
        enqueue: async () => { throw new Error('must not enqueue') },
      })
      expect(count).toBe(0)
    },
  )
