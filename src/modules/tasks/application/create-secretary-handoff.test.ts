import { describe, expect, it, vi } from 'vitest'
import type { Task } from '../domain/task'
import {
  createSecretaryHandoffTask,
  type AssigneeDirectory,
  type CreateSecretaryHandoffTaskDependencies,
} from './create-secretary-handoff'

const baseInput = {
  createdByUserId: 'secretary-1',
  assignedToUserId: 'owner-1',
  personId: 'person-1',
}

function buildDependencies(overrides: Partial<CreateSecretaryHandoffTaskDependencies> = {}) {
  const insertedTasks: Task[] = []

  const dependencies: CreateSecretaryHandoffTaskDependencies = {
    taskRepository: {
      insert: vi.fn().mockImplementation(async (task: Task) => {
        insertedTasks.push(task)
      }),
    },
    assigneeDirectory: {
      isActiveProfessional: vi.fn().mockResolvedValue(true),
    },
    idFactory: () => 'task-1',
    ...overrides,
  }

  return { dependencies, insertedTasks }
}

describe('createSecretaryHandoffTask', () => {
  it('creates a review_document task assigned to an active professional', async () => {
    const { dependencies, insertedTasks } = buildDependencies()

    const task = await createSecretaryHandoffTask(
      { ...baseInput, type: 'review_document' },
      dependencies,
    )

    expect(insertedTasks).toHaveLength(1)
    expect(task.type).toBe('review_document')
    expect(task.assignedToUserId).toBe('owner-1')
    expect(task.createdByUserId).toBe('secretary-1')
    expect(task.personId).toBe('person-1')
    expect(task.appointmentId).toBeNull()
  })

  it('rejects the handoff when the assignee is not an active professional', async () => {
    const isActiveProfessional = vi.fn().mockResolvedValue(false)
    const { dependencies, insertedTasks } = buildDependencies({
      assigneeDirectory: { isActiveProfessional } satisfies AssigneeDirectory,
    })

    await expect(
      createSecretaryHandoffTask({ ...baseInput, type: 'contact_patient' }, dependencies),
    ).rejects.toThrow('HANDOFF_ASSIGNEE_INVALID')

    expect(isActiveProfessional).toHaveBeenCalledWith('owner-1')
    expect(insertedTasks).toHaveLength(0)
  })

  it('rejects a handoff type outside the secretary-to-professional catalog', async () => {
    const { dependencies, insertedTasks } = buildDependencies()

    await expect(
      createSecretaryHandoffTask(
        // @ts-expect-error intentional invalid type for the RED test
        { ...baseInput, type: 'schedule_follow_up' },
        dependencies,
      ),
    ).rejects.toThrow('HANDOFF_TYPE_INVALID')

    expect(insertedTasks).toHaveLength(0)
  })

  it.each([
    ['review_document', 'Paciente enviou documento administrativo para revisão'],
    ['contact_patient', 'Retorno ao paciente solicitado'],
    ['special_confirmation', 'Confirmação especial necessária'],
    ['other_admin', 'Tratar pendência administrativa'],
  ] as const)('uses a fixed, closed title for %s', async (type, expectedTitle) => {
    const { dependencies, insertedTasks } = buildDependencies()

    await createSecretaryHandoffTask({ ...baseInput, type }, dependencies)

    expect(insertedTasks[0].title).toBe(expectedTitle)
  })

  it('never lets a free-text field carry content into the task title', async () => {
    const sentinel = 'SENTINEL-SECRETARY-FREE-TEXT-3a9c'
    const { dependencies, insertedTasks } = buildDependencies()

    const task = await createSecretaryHandoffTask(
      // @ts-expect-error other_admin has no free-text field on the input type; this proves one can't be smuggled in
      { ...baseInput, type: 'other_admin', note: sentinel, detail: sentinel },
      dependencies,
    )

    expect(task.title).not.toContain(sentinel)
    expect(JSON.stringify(insertedTasks[0])).not.toContain(sentinel)
  })
})
