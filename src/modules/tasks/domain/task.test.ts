import { describe, expect, it } from 'vitest'
import { createTask, TASK_TYPES } from './task'

describe('createTask', () => {
  const base = {
    id: 'task-1',
    type: 'schedule_follow_up' as const,
    title: 'Agendar retorno em 15 dias',
    createdByUserId: 'user-1',
    assignedToUserId: 'user-2',
  }

  it('creates an open task with the given fields', () => {
    const task = createTask(base)
    expect(task).toMatchObject({
      id: 'task-1',
      type: 'schedule_follow_up',
      title: 'Agendar retorno em 15 dias',
      status: 'open',
      createdByUserId: 'user-1',
      assignedToUserId: 'user-2',
      personId: null,
      appointmentId: null,
      dueAt: null,
    })
  })

  it('carries optional patient and appointment correlation', () => {
    const task = createTask({ ...base, personId: 'person-1', appointmentId: 'apt-1', dueAt: '2026-10-01T00:00:00.000Z' })
    expect(task.personId).toBe('person-1')
    expect(task.appointmentId).toBe('apt-1')
    expect(task.dueAt).toBe('2026-10-01T00:00:00.000Z')
  })

  it('rejects an unstructured type', () => {
    expect(() => createTask({ ...base, type: 'anything' as never })).toThrow('TASK_TYPE_INVALID')
  })

  it('rejects an empty title', () => {
    expect(() => createTask({ ...base, title: '  ' })).toThrow('TASK_TITLE_REQUIRED')
  })

  it('rejects a title long enough to plausibly carry clinical narrative', () => {
    expect(() => createTask({ ...base, title: 'x'.repeat(141) })).toThrow('TASK_TITLE_TOO_LONG')
  })

  it('enumerates every known administrative task type', () => {
    expect(TASK_TYPES).toEqual([
      'schedule_follow_up',
      'contact_patient',
      'resend_form',
      'collect_payment',
      'review_document',
      'other_admin',
    ])
  })
})
