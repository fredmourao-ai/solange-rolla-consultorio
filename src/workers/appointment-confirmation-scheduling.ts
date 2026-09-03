import { scheduleAppointmentConfirmations, buildAppointmentConfirmationMessage, resolveConfirmationRecipient } from '../modules/automations/public'
import type { AppointmentConfirmationMessage, ConfirmationRecipient } from '../modules/automations/public'

export type ConfirmationCandidate = {
  id: string
  startsAt: Date
  startsAtKey: string
  status: string
  person: ConfirmationRecipient
}

export type IssueAppointmentResponseLink = (candidate: ConfirmationCandidate) => Promise<string>
export type EnqueueConfirmationMessage = (message: AppointmentConfirmationMessage) => Promise<boolean>
export type SkippedConfirmationReason = 'NO_TEMPLATE_CAPABLE_CONTACT'
export type LogSkippedConfirmation = (candidateId: string, reason: SkippedConfirmationReason) => void

/**
 * scheduleAppointmentConfirmations's enqueue callback only receives the
 * idempotency key it derives internally (`appointment:${id}:confirmation:${startsAtKey}`),
 * not the appointment. Recover the id from that key rather than duplicating
 * the 23-25h/status eligibility check here -- that logic has exactly one
 * implementation, in schedule-appointment-confirmations.ts.
 */
export async function scheduleDueAppointmentConfirmations(input: {
  now: Date
  candidates: ConfirmationCandidate[]
  /**
   * Optional pre-check so a repeated poll inside the same 23-25h window
   * doesn't mint a fresh, unused capability token every cycle for an
   * appointment already scheduled -- issueLink runs only on a real miss.
   */
  alreadyEnqueued?: (idempotencyKey: string) => Promise<boolean>
  issueLink: IssueAppointmentResponseLink
  enqueue: EnqueueConfirmationMessage
  logSkipped?: LogSkippedConfirmation
}): Promise<number> {
  const byId = new Map(input.candidates.map((candidate) => [candidate.id, candidate]))

  return scheduleAppointmentConfirmations({
    now: input.now,
    appointments: input.candidates.map(({ id, startsAt, startsAtKey, status }) => ({ id, startsAt, startsAtKey, status })),
    enqueue: async (idempotencyKey) => {
      const appointmentId = idempotencyKey.split(':')[1]
      const candidate = appointmentId ? byId.get(appointmentId) : undefined
      if (!candidate) return false

      if (!resolveConfirmationRecipient(candidate.person)) {
        input.logSkipped?.(candidate.id, 'NO_TEMPLATE_CAPABLE_CONTACT')
        return false
      }

      if (await input.alreadyEnqueued?.(idempotencyKey)) return true

      const secureLink = await input.issueLink(candidate)
      const message = buildAppointmentConfirmationMessage({
        idempotencyKey,
        startsAt: candidate.startsAt,
        person: candidate.person,
        secureLink,
      })
      if (!message) return false
      return input.enqueue(message)
    },
  })
}
