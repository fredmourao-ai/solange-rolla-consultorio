import { describe, expect, it } from 'vitest'
import { buildTaskQueue, groupByStatus, groupByType, type TaskQueueRow } from './task-queue'

const now = new Date('2026-09-13T12:00:00Z')

function row(overrides: Partial<TaskQueueRow> = {}): TaskQueueRow {
  return {
    id: 'task-1',
    type: 'other_admin',
    title: 'Tratar pendência administrativa',
    status: 'open',
    assignedToUserId: 'secretary-1',
    assignedToName: 'Secretária',
    personId: null,
    personName: null,
    appointmentId: null,
    dueAt: null,
    ...overrides,
  }
}

describe('buildTaskQueue', () => {
  it('flags a task past its due date as overdue', () => {
    const queue = buildTaskQueue([row({ id: 'a', dueAt: '2026-09-12T12:00:00Z' })], now, 3)
    expect(queue.find((entry) => entry.id === 'a')?.bucket).toBe('overdue')
  })

  it('flags a task due within the horizon as due_soon', () => {
    const queue = buildTaskQueue([row({ id: 'b', dueAt: '2026-09-15T12:00:00Z' })], now, 3)
    expect(queue.find((entry) => entry.id === 'b')?.bucket).toBe('due_soon')
  })

  it('flags an unassigned task regardless of due date', () => {
    const queue = buildTaskQueue([row({ id: 'c', assignedToUserId: null, assignedToName: null })], now, 3)
    expect(queue.find((entry) => entry.id === 'c')?.bucket).toBe('unassigned')
  })

  it('gives overdue priority over unassigned when both apply', () => {
    const queue = buildTaskQueue(
      [row({ id: 'd', assignedToUserId: null, assignedToName: null, dueAt: '2026-09-01T12:00:00Z' })],
      now,
      3,
    )
    expect(queue.find((entry) => entry.id === 'd')?.bucket).toBe('overdue')
  })

  it('leaves a task with no due date and an assignee as on_track', () => {
    const queue = buildTaskQueue([row({ id: 'e', dueAt: null })], now, 3)
    expect(queue.find((entry) => entry.id === 'e')?.bucket).toBe('on_track')
  })

  it('excludes terminal (done/cancelled) tasks from the operational queue', () => {
    const queue = buildTaskQueue(
      [row({ id: 'f', status: 'done' }), row({ id: 'g', status: 'cancelled' }), row({ id: 'h', status: 'open' })],
      now,
      3,
    )
    expect(queue.map((entry) => entry.id)).toEqual(['h'])
  })

  it('sorts overdue first, then due_soon, then unassigned, then on_track, each by due date', () => {
    const queue = buildTaskQueue(
      [
        row({ id: 'ontrack', dueAt: null }),
        row({ id: 'overdue-late', dueAt: '2026-09-01T12:00:00Z' }),
        row({ id: 'unassigned', assignedToUserId: null, assignedToName: null, dueAt: '2026-09-20T12:00:00Z' }),
        row({ id: 'overdue-recent', dueAt: '2026-09-11T12:00:00Z' }),
        row({ id: 'due-soon', dueAt: '2026-09-14T12:00:00Z' }),
      ],
      now,
      3,
    )
    expect(queue.map((entry) => entry.id)).toEqual([
      'overdue-late',
      'overdue-recent',
      'due-soon',
      'unassigned',
      'ontrack',
    ])
  })
})

describe('groupByType', () => {
  it('groups queue entries by task type', () => {
    const queue = buildTaskQueue(
      [row({ id: 'a', type: 'review_document' }), row({ id: 'b', type: 'review_document' }), row({ id: 'c', type: 'other_admin' })],
      now,
      3,
    )
    const grouped = groupByType(queue)
    expect(grouped.get('review_document')?.map((entry) => entry.id)).toEqual(['a', 'b'])
    expect(grouped.get('other_admin')?.map((entry) => entry.id)).toEqual(['c'])
  })
})

describe('groupByStatus', () => {
  it('groups queue entries by task status', () => {
    const queue = buildTaskQueue(
      [row({ id: 'a', status: 'open' }), row({ id: 'b', status: 'in_progress' })],
      now,
      3,
    )
    const grouped = groupByStatus(queue)
    expect(grouped.get('open')?.map((entry) => entry.id)).toEqual(['a'])
    expect(grouped.get('in_progress')?.map((entry) => entry.id)).toEqual(['b'])
  })
})
