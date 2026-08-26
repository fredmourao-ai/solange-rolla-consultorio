import { describe, expect, it } from 'vitest'

import { formatBusinessDateTime } from './date'

describe('formatBusinessDateTime', () => {
  it('formats an instant in the business timezone by default', () => {
    expect(formatBusinessDateTime('2026-08-24T02:30:00.000Z')).toBe('23/08/2026 23:30')
  })

  it('accepts an explicit timezone instead of the server timezone', () => {
    expect(
      formatBusinessDateTime('2026-08-24T02:30:00.000Z', 'UTC'),
    ).toBe('24/08/2026 02:30')
  })
})
