import { describe, expect, it } from 'vitest'
import { normalizeCancellationPolicySnapshot } from './cancellation-policy'

describe('legacy cancellation policy snapshots', () => {
  it('hydrates fields missing from the historical v1 persisted shape', () => {
    expect(normalizeCancellationPolicySnapshot({
      policyVersion: 1,
      countableHours: 48,
      excludedWeekdays: [6, 0],
    })).toEqual({
      policyVersion: 1,
      countableHours: 48,
      excludedWeekdays: [6, 0],
      businessTimezone: 'America/Sao_Paulo',
      lateCancellationChargeEnabled: true,
      noShowChargeEnabled: true,
    })
  })

  it('rejects malformed historical snapshots instead of trusting a type cast', () => {
    expect(() => normalizeCancellationPolicySnapshot({
      policyVersion: 1,
      countableHours: 48,
      excludedWeekdays: 'weekends',
    })).toThrow('INVALID_CANCELLATION_POLICY')
  })
})
