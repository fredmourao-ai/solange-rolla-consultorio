import { describe, expect, it } from 'vitest'
import { calculateCancellationDeadline, DEFAULT_CANCELLATION_POLICY } from './cancellation-policy'

describe('cancellation policy', () => {
  it.each([
    ['2026-08-31T15:00:00-03:00', '2026-08-27T15:00:00-03:00'],
    ['2026-09-01T15:00:00-03:00', '2026-08-28T15:00:00-03:00'],
    ['2026-09-02T14:00:00-03:00', '2026-08-31T14:00:00-03:00'],
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
