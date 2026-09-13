import type { TaskStatus } from '@/modules/tasks/public'
import type { TaskType } from '@/modules/tasks/public'

const OPEN_STATUSES: readonly TaskStatus[] = ['open', 'in_progress']

export type TaskQueueBucket = 'overdue' | 'due_soon' | 'unassigned' | 'on_track'

export type TaskQueueRow = {
  id: string
  type: TaskType
  title: string
  status: TaskStatus
  assignedToUserId: string | null
  assignedToName: string | null
  personId: string | null
  personName: string | null
  appointmentId: string | null
  dueAt: string | null
}

export type TaskQueueEntry = TaskQueueRow & { bucket: TaskQueueBucket }

const bucketPriority: Record<TaskQueueBucket, number> = {
  overdue: 0,
  due_soon: 1,
  unassigned: 2,
  on_track: 3,
}

function bucketFor(row: TaskQueueRow, now: Date, dueSoonHorizonDays: number): TaskQueueBucket {
  if (row.dueAt) {
    const due = new Date(row.dueAt)
    if (due.getTime() < now.getTime()) return 'overdue'
    const horizon = new Date(now.getTime() + dueSoonHorizonDays * 24 * 60 * 60 * 1000)
    if (due.getTime() <= horizon.getTime()) return 'due_soon'
  }
  if (!row.assignedToUserId) return 'unassigned'
  return 'on_track'
}

export function buildTaskQueue(
  rows: TaskQueueRow[],
  now: Date,
  dueSoonHorizonDays: number,
): TaskQueueEntry[] {
  return rows
    .filter((row) => OPEN_STATUSES.includes(row.status))
    .map((row) => ({ ...row, bucket: bucketFor(row, now, dueSoonHorizonDays) }))
    .sort((a, b) => {
      const priorityDiff = bucketPriority[a.bucket] - bucketPriority[b.bucket]
      if (priorityDiff !== 0) return priorityDiff
      if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt)
      if (a.dueAt) return -1
      if (b.dueAt) return 1
      return 0
    })
}

export function groupByType(queue: TaskQueueEntry[]): Map<TaskType, TaskQueueEntry[]> {
  const grouped = new Map<TaskType, TaskQueueEntry[]>()
  for (const entry of queue) {
    const bucket = grouped.get(entry.type) ?? []
    bucket.push(entry)
    grouped.set(entry.type, bucket)
  }
  return grouped
}

export function groupByStatus(queue: TaskQueueEntry[]): Map<TaskStatus, TaskQueueEntry[]> {
  const grouped = new Map<TaskStatus, TaskQueueEntry[]>()
  for (const entry of queue) {
    const bucket = grouped.get(entry.status) ?? []
    bucket.push(entry)
    grouped.set(entry.status, bucket)
  }
  return grouped
}
