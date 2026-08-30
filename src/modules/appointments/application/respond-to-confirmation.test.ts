import { describe, expect, it } from 'vitest'
import { respondToConfirmation } from './respond-to-confirmation'

const context = {
  origin: 'https://app.test', capabilitySessionId: 'session-1',
  purpose: 'appointment_response', subjectId: 'a1',
}

function repository(deadline = '2026-08-30T12:00:00Z') {
  const updated: string[] = []
  let tasks = 0
  return {
    updated,
    tasks: () => tasks,
    repo: {
      getResponseState: async () => ({ status: 'pending_confirmation', cancellationDeadlineAt: deadline }),
      updateStatus: async (_id: string, status: string) => { updated.push(status); return { status } },
      createRescheduleTask: async () => { tasks += 1; return 'task-1' },
    },
  }
}
describe('appointment confirmation response', () => {
  it('requests rescheduling without changing time', async () => {
    const state = repository()
    const result = await respondToConfirmation({ appointmentId: 'a1', action: 'request_reschedule', publicActionContext: context, now: new Date('2026-08-29T12:00:00Z') }, state.repo)
    expect(result).toEqual({ status: 'reschedule_requested', taskId: 'task-1' })
    expect(state.updated).toEqual(['reschedule_requested'])
    expect(state.tasks()).toBe(1)
  })

  it('cancels in time without extra acknowledgement', async () => {
    const state = repository('2026-08-30T12:00:00Z')
    const result = await respondToConfirmation({ appointmentId: 'a1', action: 'cancel', publicActionContext: context, now: new Date('2026-08-29T12:00:00Z') }, state.repo)
    expect(result.status).toBe('cancelled_in_time')
    expect(state.updated).toEqual(['cancelled_in_time'])
  })
  it('requires explicit acknowledgement for late cancellation', async () => {
    const state = repository('2026-08-28T12:00:00Z')
    await expect(respondToConfirmation({ appointmentId: 'a1', action: 'cancel', publicActionContext: context, now: new Date('2026-08-29T12:00:00Z') }, state.repo)).rejects.toThrow('LATE_CANCELLATION_ACK_REQUIRED')
    expect(state.updated).toEqual([])

    const result = await respondToConfirmation({ appointmentId: 'a1', action: 'cancel', acknowledgeLateCharge: true, publicActionContext: context, now: new Date('2026-08-29T12:00:00Z') }, state.repo)
    expect(result.status).toBe('cancelled_late')
    expect(state.updated).toEqual(['cancelled_late'])
  })

  it('confirms an eligible appointment', async () => {
    const state = repository()
    const result = await respondToConfirmation({ appointmentId: 'a1', action: 'confirm', publicActionContext: context, now: new Date('2026-08-29T12:00:00Z') }, state.repo)
    expect(result.status).toBe('confirmed')
  })
})

// Transition guard regression: a terminal response cannot be overwritten by another public action.
describe('appointment confirmation transition guard', () => {
  it('rejects cancelling an already confirmed appointment when public confirm flow no longer permits that command', async () => {
    const state = repository('2030-01-01T00:00:00Z')
    state.repo.getResponseState = async () => ({ status: 'cancelled_in_time', cancellationDeadlineAt: '2030-01-01T00:00:00Z' })
    await expect(respondToConfirmation({ appointmentId: 'a1', action: 'confirm', publicActionContext: context }, state.repo)).rejects.toThrow('INVALID_APPOINTMENT_TRANSITION')
    expect(state.updated).toEqual([])
  })
})
