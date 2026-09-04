import { describe, expect, it } from 'vitest'
import { appointmentWindow, formatSaoPauloDateTimeLocal, hasAppointmentConflict } from './appointment-management'

describe('appointment management', () => {
  it('interprets datetime-local in Sao Paulo and applies service duration', () => {
    const window = appointmentWindow('2026-09-10T14:30', 50)
    expect(window.startsAt.toISOString()).toBe('2026-09-10T17:30:00.000Z')
    expect(window.endsAt.toISOString()).toBe('2026-09-10T18:20:00.000Z')
  })

  it('detects overlap but ignores the row being edited and cancelled rows', () => {
    const requested = appointmentWindow('2026-09-10T14:30', 50)
    const rows = [
      { id: 'a1', startsAt: '2026-09-10T17:00:00.000Z', endsAt: '2026-09-10T18:00:00.000Z', status: 'scheduled' },
      { id: 'a2', startsAt: '2026-09-10T17:00:00.000Z', endsAt: '2026-09-10T18:00:00.000Z', status: 'cancelled_in_time' },
    ]
    expect(hasAppointmentConflict(requested, rows)).toBe(true)
    expect(hasAppointmentConflict(requested, rows, 'a1')).toBe(false)
  })

  it('formats persisted timestamps back to a Sao Paulo datetime-local value', () => {
    expect(formatSaoPauloDateTimeLocal('2026-09-10T17:30:00.000Z')).toBe('2026-09-10T14:30')
  })
})
