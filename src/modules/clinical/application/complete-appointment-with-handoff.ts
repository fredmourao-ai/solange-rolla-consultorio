import 'server-only'
import { randomUUID } from 'node:crypto'
import type { ClinicalRecord } from '../domain/clinical-record'
import {
  createClinicalRecord,
  type CreateClinicalRecordDependencies,
  type CreateClinicalRecordInput,
} from './create-clinical-record'
import { createTaskAndPersist, type Task, type TaskRepository, type TaskType } from '../../tasks/public'

export const HANDOFF_TASK_TYPES = [
  'schedule_follow_up',
  'contact_patient',
  'resend_form',
  'other_admin',
] as const
export type HandoffTaskType = (typeof HANDOFF_TASK_TYPES)[number]

const isHandoffTaskType = (value: string): value is HandoffTaskType =>
  (HANDOFF_TASK_TYPES as readonly string[]).includes(value)

/**
 * Fixed, closed-form administrative titles. Never derived from clinical
 * plaintext: the secretary must never receive free text originating in the
 * clinical editor, even for `other_admin`.
 */
const ADMIN_TASK_TITLES: Record<HandoffTaskType, string> = {
  schedule_follow_up: 'Agendar retorno com o paciente',
  contact_patient: 'Entrar em contato com o paciente',
  resend_form: 'Reenviar formulário ao paciente',
  other_admin: 'Tratar pendência administrativa',
}

const MIN_FOLLOW_UP_DAYS = 1
const MAX_FOLLOW_UP_DAYS = 180

export type HandoffInput = {
  type: HandoffTaskType
  assignedToUserId: string
  followUpInDays?: number
}

export type CompleteAppointmentWithHandoffInput = CreateClinicalRecordInput & {
  handoff?: HandoffInput
}

export type AssigneeDirectory = {
  isActiveSecretary(userId: string): Promise<boolean>
}

export type CompleteAppointmentWithHandoffDependencies = CreateClinicalRecordDependencies & {
  taskRepository: TaskRepository
  assigneeDirectory: AssigneeDirectory
  taskIdFactory?: () => string
}

export type CompleteAppointmentWithHandoffResult = {
  clinicalRecord: ClinicalRecord
  task: Task | null
}

function dueAtFromDays(days: number): string {
  const clamped = Math.min(Math.max(Math.trunc(days), MIN_FOLLOW_UP_DAYS), MAX_FOLLOW_UP_DAYS)
  return new Date(Date.now() + clamped * 24 * 60 * 60 * 1000).toISOString()
}

export async function completeAppointmentWithHandoff(
  input: CompleteAppointmentWithHandoffInput,
  dependencies: CompleteAppointmentWithHandoffDependencies,
): Promise<CompleteAppointmentWithHandoffResult> {
  if (!input.handoff) {
    const clinicalRecord = await createClinicalRecord(input, dependencies)
    return { clinicalRecord, task: null }
  }

  const { type, assignedToUserId, followUpInDays } = input.handoff
  if (!isHandoffTaskType(type)) throw new Error('HANDOFF_TYPE_INVALID')

  const isSecretary = await dependencies.assigneeDirectory.isActiveSecretary(assignedToUserId)
  if (!isSecretary) throw new Error('HANDOFF_ASSIGNEE_INVALID')

  if (type === 'schedule_follow_up' && (!followUpInDays || followUpInDays < MIN_FOLLOW_UP_DAYS)) {
    throw new Error('HANDOFF_FOLLOW_UP_DAYS_REQUIRED')
  }

  const clinicalRecord = await createClinicalRecord(input, dependencies)
  const task = await createTaskAndPersist(
    {
      id: dependencies.taskIdFactory?.() ?? randomUUID(),
      type: type as TaskType,
      title: ADMIN_TASK_TITLES[type],
      createdByUserId: input.authorUserId,
      assignedToUserId,
      personId: input.personId,
      appointmentId: input.appointmentId,
      dueAt: type === 'schedule_follow_up' ? dueAtFromDays(followUpInDays as number) : null,
    },
    dependencies.taskRepository,
  )

  return { clinicalRecord, task }
}
