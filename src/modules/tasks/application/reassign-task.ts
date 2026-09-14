import type { Task } from '../domain/task'

export type ReassignTaskRepository = {
  findById(id: string): Promise<Task | null>
  updateAssignee(id: string, assignedToUserId: string | null): Promise<void>
}

export async function reassignTask(
  id: string,
  assignedToUserId: string | null,
  repository: ReassignTaskRepository,
): Promise<Task> {
  const task = await repository.findById(id)
  if (!task) throw new Error('TASK_NOT_FOUND')
  if (task.status === 'done' || task.status === 'cancelled') throw new Error('TASK_ALREADY_CLOSED')

  await repository.updateAssignee(id, assignedToUserId)
  return { ...task, assignedToUserId }
}
