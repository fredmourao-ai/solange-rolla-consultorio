import { describe, expect, it, vi } from 'vitest'
import { createTaskAndPersist, type TaskRepository } from './create-task'

describe('createTaskAndPersist', () => {
  const input = {
    id: 'task-1',
    type: 'schedule_follow_up' as const,
    title: 'Agendar retorno em 15 dias',
    createdByUserId: 'user-1',
    assignedToUserId: 'user-2',
  }

  it('persists a newly created task through the repository', async () => {
    const insert = vi.fn().mockResolvedValue(undefined)
    const repository: TaskRepository = { insert }

    const task = await createTaskAndPersist(input, repository)

    expect(task.status).toBe('open')
    expect(insert).toHaveBeenCalledWith(task)
  })

  it('never calls the repository when the domain rejects the input', async () => {
    const insert = vi.fn().mockResolvedValue(undefined)
    const repository: TaskRepository = { insert }

    await expect(createTaskAndPersist({ ...input, title: '' }, repository)).rejects.toThrow('TASK_TITLE_REQUIRED')
    expect(insert).not.toHaveBeenCalled()
  })
})
