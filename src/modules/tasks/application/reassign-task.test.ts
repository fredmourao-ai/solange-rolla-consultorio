import { describe, expect, it, vi } from 'vitest'
import type { Task } from '../domain/task'
import { reassignTask, type ReassignTaskRepository } from './reassign-task'

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    type: 'other_admin',
    title: 'Tratar pendência administrativa',
    status: 'open',
    createdByUserId: 'secretary-1',
    assignedToUserId: null,
    personId: null,
    appointmentId: null,
    dueAt: null,
    ...overrides,
  }
}

describe('reassignTask', () => {
  it('claims an unassigned task for the given user', async () => {
    const task = buildTask({ assignedToUserId: null })
    const repository: ReassignTaskRepository = {
      findById: vi.fn().mockResolvedValue(task),
      updateAssignee: vi.fn().mockResolvedValue(undefined),
    }

    const result = await reassignTask('task-1', 'secretary-2', repository)

    expect(result.assignedToUserId).toBe('secretary-2')
    expect(repository.updateAssignee).toHaveBeenCalledWith('task-1', 'secretary-2')
  })

  it('reassigns a task already held by someone else', async () => {
    const task = buildTask({ assignedToUserId: 'secretary-1' })
    const repository: ReassignTaskRepository = {
      findById: vi.fn().mockResolvedValue(task),
      updateAssignee: vi.fn().mockResolvedValue(undefined),
    }

    const result = await reassignTask('task-1', 'owner-1', repository)

    expect(result.assignedToUserId).toBe('owner-1')
  })

  it('releases a task back to the unassigned pool', async () => {
    const task = buildTask({ assignedToUserId: 'secretary-1' })
    const repository: ReassignTaskRepository = {
      findById: vi.fn().mockResolvedValue(task),
      updateAssignee: vi.fn().mockResolvedValue(undefined),
    }

    const result = await reassignTask('task-1', null, repository)

    expect(result.assignedToUserId).toBeNull()
  })

  it('rejects reassigning a task that no longer exists', async () => {
    const repository: ReassignTaskRepository = {
      findById: vi.fn().mockResolvedValue(null),
      updateAssignee: vi.fn().mockResolvedValue(undefined),
    }

    await expect(reassignTask('missing', 'secretary-1', repository)).rejects.toThrow('TASK_NOT_FOUND')
    expect(repository.updateAssignee).not.toHaveBeenCalled()
  })

  it.each(['done', 'cancelled'] as const)('rejects reassigning a %s task', async (status) => {
    const task = buildTask({ status })
    const repository: ReassignTaskRepository = {
      findById: vi.fn().mockResolvedValue(task),
      updateAssignee: vi.fn().mockResolvedValue(undefined),
    }

    await expect(reassignTask('task-1', 'secretary-1', repository)).rejects.toThrow('TASK_ALREADY_CLOSED')
    expect(repository.updateAssignee).not.toHaveBeenCalled()
  })
})
