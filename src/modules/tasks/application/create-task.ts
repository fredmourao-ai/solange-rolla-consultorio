import { createTask, type Task, type TaskInput } from '../domain/task'

export type TaskRepository = {
  insert(task: Task): Promise<void>
}

export async function createTaskAndPersist(input: TaskInput, repository: TaskRepository): Promise<Task> {
  const task = createTask(input)
  await repository.insert(task)
  return task
}
