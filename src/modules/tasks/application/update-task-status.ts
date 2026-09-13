import { canTransitionTask, type TaskStatus } from '../domain/status'
import type { Task } from '../domain/task'

export type TaskStatusRepository = {
  findById(id: string): Promise<Task | null>
  updateStatus(id: string, status: TaskStatus): Promise<void>
}

export async function updateTaskStatus(id: string, status: TaskStatus, repository: TaskStatusRepository): Promise<Task> {
  const task = await repository.findById(id)
  if (!task) throw new Error('TASK_NOT_FOUND')
  if (!canTransitionTask(task.status, status)) throw new Error('TASK_TRANSITION_INVALID')

  await repository.updateStatus(id, status)
  return { ...task, status }
}
