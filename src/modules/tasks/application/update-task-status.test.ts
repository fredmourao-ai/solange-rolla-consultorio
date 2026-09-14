import { describe, expect, it, vi } from 'vitest'
import type { Task } from '../domain/task'
import { updateTaskStatus, type TaskStatusRepository } from './update-task-status'

const baseTask: Task = {
  id: 'task-1',
  type: 'schedule_follow_up',
  title: 'Agendar retorno',
  status: 'open',
  createdByUserId: 'user-1',
  assignedToUserId: 'user-2',
  personId: null,
  appointmentId: null,
  dueAt: null,
}

describe('updateTaskStatus', () => {
  it('persists the new status when the transition is allowed', async () => {
    const findById = vi.fn().mockResolvedValue(baseTask)
    const updateStatus = vi.fn().mockResolvedValue(undefined)
    const repository: TaskStatusRepository = { findById, updateStatus }

    const updated = await updateTaskStatus('task-1', 'done', repository)

    expect(updated.status).toBe('done')
    expect(updateStatus).toHaveBeenCalledWith('task-1', 'done')
  })

  it('rejects a transition out of a terminal status without persisting', async () => {
    const findById = vi.fn().mockResolvedValue({ ...baseTask, status: 'done' })
    const updateStatus = vi.fn().mockResolvedValue(undefined)
    const repository: TaskStatusRepository = { findById, updateStatus }

    await expect(updateTaskStatus('task-1', 'open', repository)).rejects.toThrow('TASK_TRANSITION_INVALID')
    expect(updateStatus).not.toHaveBeenCalled()
  })

  it('rejects when the task does not exist', async () => {
    const findById = vi.fn().mockResolvedValue(null)
    const updateStatus = vi.fn().mockResolvedValue(undefined)
    const repository: TaskStatusRepository = { findById, updateStatus }

    await expect(updateTaskStatus('missing', 'done', repository)).rejects.toThrow('TASK_NOT_FOUND')
    expect(updateStatus).not.toHaveBeenCalled()
  })
})
