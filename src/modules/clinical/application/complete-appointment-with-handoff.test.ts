import { describe, expect, it, vi } from 'vitest'
import type { ClinicalRecord } from '../domain/clinical-record'
import type { Task } from '../../tasks/public'
import {
  completeAppointmentWithHandoff,
  type AssigneeDirectory,
  type CompleteAppointmentWithHandoffDependencies,
} from './complete-appointment-with-handoff'

const baseInput = {
  appointmentId: 'appt-1',
  personId: 'person-1',
  authorUserId: 'professional-1',
  plaintext: 'Evolução clínica confidencial do paciente.',
}

function buildDependencies(overrides: Partial<CompleteAppointmentWithHandoffDependencies> = {}) {
  const insertedRecord: ClinicalRecord = {
    id: 'record-1',
    appointmentId: baseInput.appointmentId,
    personId: baseInput.personId,
    authorUserId: baseInput.authorUserId,
    ciphertext: 'cipher',
    iv: 'iv',
    authTag: 'tag',
    keyVersion: 1,
    createdAt: new Date().toISOString(),
  }

  const insertedTasks: Task[] = []

  const dependencies: CompleteAppointmentWithHandoffDependencies = {
    crypto: {
      encrypt: vi.fn().mockResolvedValue({ ciphertext: 'cipher', iv: 'iv', authTag: 'tag', keyVersion: 1 }),
      decrypt: vi.fn(),
    },
    repository: {
      insert: vi.fn().mockResolvedValue(insertedRecord),
    },
    audit: {
      insert: vi.fn().mockResolvedValue(undefined),
    },
    taskRepository: {
      insert: vi.fn().mockImplementation(async (task: Task) => {
        insertedTasks.push(task)
      }),
    },
    assigneeDirectory: {
      isActiveSecretary: vi.fn().mockResolvedValue(true),
    },
    taskIdFactory: () => 'task-1',
    ...overrides,
  }

  return { dependencies, insertedTasks }
}

describe('completeAppointmentWithHandoff', () => {
  it('creates the clinical record and returns no task when no handoff is requested', async () => {
    const { dependencies, insertedTasks } = buildDependencies()

    const result = await completeAppointmentWithHandoff(baseInput, dependencies)

    expect(result.clinicalRecord.id).toBe('record-1')
    expect(result.task).toBeNull()
    expect(insertedTasks).toHaveLength(0)
  })

  it('creates a schedule_follow_up task assigned to an active secretary with a computed due date', async () => {
    const { dependencies, insertedTasks } = buildDependencies()

    const result = await completeAppointmentWithHandoff(
      {
        ...baseInput,
        handoff: { type: 'schedule_follow_up', assignedToUserId: 'secretary-1', followUpInDays: 15 },
      },
      dependencies,
    )

    expect(result.task).not.toBeNull()
    expect(insertedTasks).toHaveLength(1)
    const task = insertedTasks[0]
    expect(task.type).toBe('schedule_follow_up')
    expect(task.assignedToUserId).toBe('secretary-1')
    expect(task.createdByUserId).toBe('professional-1')
    expect(task.personId).toBe('person-1')
    expect(task.appointmentId).toBe('appt-1')
    expect(task.dueAt).not.toBeNull()
    expect(new Date(task.dueAt as string).getTime()).toBeGreaterThan(Date.now())
  })

  it('rejects the handoff when the assignee is not an active secretary', async () => {
    const isActiveSecretary = vi.fn().mockResolvedValue(false)
    const { dependencies, insertedTasks } = buildDependencies({
      assigneeDirectory: { isActiveSecretary } satisfies AssigneeDirectory,
    })

    await expect(
      completeAppointmentWithHandoff(
        { ...baseInput, handoff: { type: 'contact_patient', assignedToUserId: 'psychologist-2' } },
        dependencies,
      ),
    ).rejects.toThrow('HANDOFF_ASSIGNEE_INVALID')

    expect(isActiveSecretary).toHaveBeenCalledWith('psychologist-2')
    expect(insertedTasks).toHaveLength(0)
  })

  it('requires followUpInDays for schedule_follow_up', async () => {
    const { dependencies, insertedTasks } = buildDependencies()

    await expect(
      completeAppointmentWithHandoff(
        { ...baseInput, handoff: { type: 'schedule_follow_up', assignedToUserId: 'secretary-1' } },
        dependencies,
      ),
    ).rejects.toThrow('HANDOFF_FOLLOW_UP_DAYS_REQUIRED')

    expect(insertedTasks).toHaveLength(0)
  })

  it('never derives the administrative task title from the clinical plaintext (other_admin uses a closed title)', async () => {
    const sentinel = 'SENTINEL-CLINICAL-PLAINTEXT-7f3ad2'
    const { dependencies, insertedTasks } = buildDependencies()

    const result = await completeAppointmentWithHandoff(
      {
        ...baseInput,
        plaintext: `Relato do paciente contendo ${sentinel} e detalhes sensíveis.`,
        handoff: { type: 'other_admin', assignedToUserId: 'secretary-1' },
      },
      dependencies,
    )

    expect(insertedTasks).toHaveLength(1)
    const task = insertedTasks[0]
    expect(task.title).not.toContain(sentinel)
    expect(task.title).toBe('Tratar pendência administrativa')
    expect(JSON.stringify(result)).not.toContain(sentinel)
    expect(JSON.stringify(task)).not.toContain(sentinel)
  })

  it('never includes clinical plaintext in fixed titles for any handoff type', async () => {
    const sentinel = 'SENTINEL-OTHER-9c1e'
    const types = ['schedule_follow_up', 'contact_patient', 'resend_form', 'other_admin'] as const

    for (const type of types) {
      const { dependencies, insertedTasks } = buildDependencies()
      await completeAppointmentWithHandoff(
        {
          ...baseInput,
          plaintext: `${sentinel} texto clínico livre`,
          handoff: { type, assignedToUserId: 'secretary-1', followUpInDays: 7 },
        },
        dependencies,
      )
      expect(insertedTasks[0].title).not.toContain(sentinel)
    }
  })

  it('rejects an unknown handoff type', async () => {
    const { dependencies } = buildDependencies()

    await expect(
      completeAppointmentWithHandoff(
        // @ts-expect-error intentional invalid type for the RED test
        { ...baseInput, handoff: { type: 'not_a_real_type', assignedToUserId: 'secretary-1' } },
        dependencies,
      ),
    ).rejects.toThrow('HANDOFF_TYPE_INVALID')
  })
})
