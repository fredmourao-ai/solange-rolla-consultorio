import { describe, expect, it } from 'vitest'
import { respondToConfirmation } from './respond-to-confirmation'

describe('appointment confirmation response', () => {
  it('requests rescheduling without changing the appointment time', async () => {
    const updated: string[] = []
    const result = await respondToConfirmation({ appointmentId: 'a1', action: 'request_reschedule', publicActionContext: { origin: 'https://app.test', capabilitySessionId: 'session-1', purpose: 'appointment_response', subjectId: 'a1' } }, {
      updateStatus: async (_id, status) => { updated.push(status); return { status } },
      createRescheduleTask: async () => 'task-1',
    })
    expect(result).toEqual({ status: 'reschedule_requested', taskId: 'task-1' })
    expect(updated).toEqual(['reschedule_requested'])
  })
})
