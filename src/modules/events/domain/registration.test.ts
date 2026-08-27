import { describe, expect, it } from 'vitest'
import { registrationStatus, type EventCapacity } from './registration'

describe('event registration capacity', () => {
  const event: EventCapacity = { capacity: 20, waitlistEnabled: true }

  it('confirms registrations through capacity and waitlists the next one', () => {
    expect(registrationStatus(event, 0)).toBe('confirmed')
    expect(registrationStatus(event, 19)).toBe('confirmed')
    expect(registrationStatus(event, 20)).toBe('waitlisted')
  })

  it('rejects over-capacity registration when waitlist is disabled', () => {
    expect(registrationStatus({ ...event, waitlistEnabled: false }, 20)).toBe('rejected_capacity')
  })
})
