import { describe, expect, it, vi } from 'vitest'
import { scheduleDueAppointmentConfirmations, type ConfirmationCandidate } from './appointment-confirmation-scheduling'

function candidate(overrides: Partial<ConfirmationCandidate> = {}): ConfirmationCandidate {
  return {
    id: 'appt-1',
    startsAt: new Date('2026-09-04T15:00:00.000Z'),
    startsAtKey: '2026-09-04T15:00:00.000Z',
    status: 'scheduled',
    person: { preferredName: 'Maria', phoneE164: '+5511999999999', emailNormalized: null, preferredChannel: 'whatsapp' },
    ...overrides,
  }
}

const now = new Date('2026-09-03T15:00:00.000Z') // exactly 24h before the candidate's startsAt

describe('scheduleDueAppointmentConfirmations', () => {
  it('issues a link, builds the message, and enqueues it for a due appointment', async () => {
    const issueLink = vi.fn(async () => 'https://app.test/c/raw-token?purpose=appointment_response')
    const enqueue = vi.fn(async () => true)

    const count = await scheduleDueAppointmentConfirmations({
      now, candidates: [candidate()], issueLink, enqueue,
    })

    expect(count).toBe(1)
    expect(issueLink).toHaveBeenCalledTimes(1)
    expect(issueLink).toHaveBeenCalledWith(expect.objectContaining({ id: 'appt-1' }))
    expect(enqueue).toHaveBeenCalledTimes(1)
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: 'appointment:appt-1:confirmation:2026-09-04T15:00:00.000Z',
      channel: 'whatsapp',
      recipient: '+5511999999999',
      templateKey: 'appointment_confirmation',
    }))
  })

  it('does not issue a link or enqueue when the person has no template-capable contact', async () => {
    const issueLink = vi.fn(async () => 'https://app.test/c/raw-token')
    const enqueue = vi.fn(async () => true)
    const logSkipped = vi.fn()

    const count = await scheduleDueAppointmentConfirmations({
      now,
      candidates: [candidate({ person: { preferredName: 'Maria', phoneE164: null, emailNormalized: null, preferredChannel: 'none' } })],
      issueLink, enqueue, logSkipped,
    })

    expect(count).toBe(0)
    expect(issueLink).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
    expect(logSkipped).toHaveBeenCalledWith('appt-1', 'NO_TEMPLATE_CAPABLE_CONTACT')
  })

  it('does not schedule appointments outside the eligibility window, delegating entirely to scheduleAppointmentConfirmations', async () => {
    const issueLink = vi.fn(async () => 'https://app.test/c/raw-token')
    const enqueue = vi.fn(async () => true)

    const count = await scheduleDueAppointmentConfirmations({
      now,
      candidates: [candidate({ id: 'appt-2', startsAt: new Date('2026-09-10T15:00:00.000Z'), startsAtKey: '2026-09-10T15:00:00.000Z' })],
      issueLink, enqueue,
    })

    expect(count).toBe(0)
    expect(issueLink).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('does not count a duplicate delivery when enqueue reports the message already existed', async () => {
    const issueLink = vi.fn(async () => 'https://app.test/c/raw-token')
    const enqueue = vi.fn(async () => false)

    const count = await scheduleDueAppointmentConfirmations({ now, candidates: [candidate()], issueLink, enqueue })
    expect(count).toBe(0)
  })

  it('skips minting a new capability link on a repeat poll once the confirmation is already enqueued', async () => {
    const issueLink = vi.fn(async () => 'https://app.test/c/raw-token')
    const enqueue = vi.fn(async () => true)
    const alreadyEnqueued = vi.fn(async () => true)

    const count = await scheduleDueAppointmentConfirmations({
      now, candidates: [candidate()], alreadyEnqueued, issueLink, enqueue,
    })

    expect(count).toBe(1)
    expect(alreadyEnqueued).toHaveBeenCalledWith('appointment:appt-1:confirmation:2026-09-04T15:00:00.000Z')
    expect(issueLink).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
  })
})
