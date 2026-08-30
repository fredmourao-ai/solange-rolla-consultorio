import { describe, expect, it } from 'vitest'
import { calendarRange } from './calendar-range'

describe('calendarRange', () => {
  it('builds a Sao Paulo day range', () => {
    const range = calendarRange('day', '2026-08-29')
    expect(range.from.toISOString()).toBe('2026-08-29T03:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-08-30T03:00:00.000Z')
  })

  it('uses Monday through Monday for week view', () => {
    const range = calendarRange('week', '2026-08-29')
    expect(range.from.toISOString()).toBe('2026-08-24T03:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-08-31T03:00:00.000Z')
  })

  it('uses the local calendar month', () => {
    const range = calendarRange('month', '2026-08-29')
    expect(range.from.toISOString()).toBe('2026-08-01T03:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-09-01T03:00:00.000Z')
  })
})
