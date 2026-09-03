import { describe, expect, it } from 'vitest'
import { calculateCancellationDeadline, DEFAULT_CANCELLATION_POLICY } from './cancellation-policy'

describe('cancellation policy', () => {
  it.each([
    // Mon 2026-08-31 -> Thu 2026-08-27 (crosses one full weekend).
    ['2026-08-31T15:00:00-03:00', '2026-08-27T15:00:00-03:00'],
    // Tue 2026-09-01 -> Fri 2026-08-28 (crosses one full weekend).
    ['2026-09-01T15:00:00-03:00', '2026-08-28T15:00:00-03:00'],
    // Wed 2026-09-02 -> Mon 2026-08-31 (no weekend in between).
    ['2026-09-02T14:00:00-03:00', '2026-08-31T14:00:00-03:00'],
    // Thu 2026-09-03 -> Tue 2026-09-01 (no weekend in between).
    ['2026-09-03T15:00:00-03:00', '2026-09-01T15:00:00-03:00'],
    // Fri 2026-09-04 -> Wed 2026-09-02 (no weekend in between).
    ['2026-09-04T15:00:00-03:00', '2026-09-02T15:00:00-03:00'],
    // Sat 2026-08-29 -> Thu 2026-08-27: the appointment's own weekday does
    // not matter, only the days counted backward from it.
    ['2026-08-29T15:00:00-03:00', '2026-08-27T15:00:00-03:00'],
    // Sun 2026-08-30 -> Thu 2026-08-27: same deadline as the Saturday
    // appointment above, since Saturday itself is excluded from the count.
    ['2026-08-30T15:00:00-03:00', '2026-08-27T15:00:00-03:00'],
  ])('calculates 48 countable hours excluding weekends', (start, expected) => {
    expect(calculateCancellationDeadline(new Date(start), DEFAULT_CANCELLATION_POLICY).toISOString())
      .toBe(new Date(expected).toISOString())
  })

  it('crosses month and year boundaries', () => {
    expect(
      calculateCancellationDeadline(
        new Date('2027-01-04T10:00:00-03:00'),
        DEFAULT_CANCELLATION_POLICY,
      ).toISOString(),
    ).toBe(new Date('2026-12-31T10:00:00-03:00').toISOString())
  })

  it('rejects policies that cannot represent whole computable days', () => {
    expect(() =>
      calculateCancellationDeadline(new Date('2026-09-01T15:00:00-03:00'), {
        ...DEFAULT_CANCELLATION_POLICY,
        countableHours: 25,
      }),
    ).toThrow('INVALID_CANCELLATION_POLICY')
  })
})
