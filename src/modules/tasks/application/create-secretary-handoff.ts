import 'server-only'
import { randomUUID } from 'node:crypto'
import { createTask, type Task } from '../domain/task'
import type { TaskRepository } from './create-task'

export const SECRETARY_HANDOFF_TASK_TYPES = [
  'review_document',
  'contact_patient',
  'special_confirmation',
  'other_admin',
] as const
export type SecretaryHandoffTaskType = (typeof SECRETARY_HANDOFF_TASK_TYPES)[number]

const isSecretaryHandoffTaskType = (value: string): value is SecretaryHandoffTaskType =>
  (SECRETARY_HANDOFF_TASK_TYPES as readonly string[]).includes(value)

/**
 * Fixed, closed-form administrative titles. Never derived from free text: a
 * patient's submitted document or message may itself carry clinical content,
 * and this task must never become a channel for it. When the underlying
 * context is clinical, the professional is expected to follow personId
 * (already correlated below) to the protected clinical record themselves.
 */
const HANDOFF_TASK_TITLES: Record<SecretaryHandoffTaskType, string> = {
  review_document: 'Paciente enviou documento administrativo para revisão',
  contact_patient: 'Retorno ao paciente solicitado',
  special_confirmation: 'Confirmação especial necessária',
  other_admin: 'Tratar pendência administrativa',
}

export type CreateSecretaryHandoffTaskInput = {
  type: SecretaryHandoffTaskType
  createdByUserId: string
  assignedToUserId: string
  personId?: string | null
  appointmentId?: string | null
}

export type AssigneeDirectory = {
  isActiveProfessional(userId: string): Promise<boolean>
}

export type CreateSecretaryHandoffTaskDependencies = {
  taskRepository: TaskRepository
  assigneeDirectory: AssigneeDirectory
  idFactory?: () => string
}

export async function createSecretaryHandoffTask(
  input: CreateSecretaryHandoffTaskInput,
  dependencies: CreateSecretaryHandoffTaskDependencies,
): Promise<Task> {
  if (!isSecretaryHandoffTaskType(input.type)) throw new Error('HANDOFF_TYPE_INVALID')

  const isProfessional = await dependencies.assigneeDirectory.isActiveProfessional(input.assignedToUserId)
  if (!isProfessional) throw new Error('HANDOFF_ASSIGNEE_INVALID')

  const task = createTask({
    id: dependencies.idFactory?.() ?? randomUUID(),
    type: input.type,
    title: HANDOFF_TASK_TITLES[input.type],
    createdByUserId: input.createdByUserId,
    assignedToUserId: input.assignedToUserId,
    personId: input.personId,
    appointmentId: input.appointmentId,
  })

  await dependencies.taskRepository.insert(task)
  return task
}
