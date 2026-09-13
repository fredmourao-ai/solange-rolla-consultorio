import { type TaskStatus } from './status'

export const TASK_TYPES = [
  'schedule_follow_up',
  'contact_patient',
  'resend_form',
  'collect_payment',
  'review_document',
  'special_confirmation',
  'other_admin',
] as const
export type TaskType = (typeof TASK_TYPES)[number]

const TITLE_MAX_LENGTH = 140

export type Task = {
  id: string
  type: TaskType
  title: string
  status: TaskStatus
  createdByUserId: string
  assignedToUserId: string | null
  personId: string | null
  appointmentId: string | null
  dueAt: string | null
}

export type TaskInput = {
  id: string
  type: TaskType
  title: string
  createdByUserId: string
  assignedToUserId?: string | null
  personId?: string | null
  appointmentId?: string | null
  dueAt?: string | null
}

export function createTask(input: TaskInput): Task {
  if (!TASK_TYPES.includes(input.type)) throw new Error('TASK_TYPE_INVALID')
  const title = input.title.trim()
  if (!title) throw new Error('TASK_TITLE_REQUIRED')
  if (title.length > TITLE_MAX_LENGTH) throw new Error('TASK_TITLE_TOO_LONG')

  return {
    id: input.id,
    type: input.type,
    title,
    status: 'open',
    createdByUserId: input.createdByUserId,
    assignedToUserId: input.assignedToUserId ?? null,
    personId: input.personId ?? null,
    appointmentId: input.appointmentId ?? null,
    dueAt: input.dueAt ?? null,
  }
}
