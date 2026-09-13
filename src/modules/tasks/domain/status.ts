export const TASK_STATUSES = ['open', 'in_progress', 'done', 'cancelled'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

const terminalStatuses: ReadonlySet<TaskStatus> = new Set(['done', 'cancelled'])

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return false
  if (terminalStatuses.has(from)) return false
  return true
}
