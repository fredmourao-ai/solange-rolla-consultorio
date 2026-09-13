import { notFound, redirect } from 'next/navigation'
import {
  authorizeStaffPermission,
  authorizeStaffSession,
  AuthorizationError,
  getStaffSession,
  isActiveStaffWithRole,
  listActiveStaffByRole,
  type StaffDirectoryRepository,
} from '@/modules/identity/public'
import {
  completeAppointmentWithHandoff,
  HANDOFF_TASK_TYPES,
  listClinicalRecords,
  type AssigneeDirectory,
  type ClinicalRecord,
  type ClinicalRecordInsert,
  type HandoffInput,
  type HandoffTaskType,
} from '@/modules/clinical/public'
import type { Task, TaskRepository } from '@/modules/tasks/public'
import { ClinicalRecordEditor } from '@/modules/clinical/ui/clinical-record-editor'
import { ClinicalTimeline } from '@/modules/clinical/ui/clinical-timeline'
import { createSensitiveDataCrypto } from '@/platform/crypto/aes-gcm'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import type { AuditEvent } from '@/modules/audit/public'
import type { Database } from '@/platform/supabase/types'

export const dynamic = 'force-dynamic'

function isHandoffTaskType(value: string): value is HandoffTaskType {
  return (HANDOFF_TASK_TYPES as readonly string[]).includes(value)
}

async function completeAppointmentAction(formData: FormData) {
  'use server'

  const session = await getStaffSession()
  const authorizedSession = authorizeStaffSession(session, ['psychologist_owner'], { aal2: true })
  authorizeStaffPermission(session, 'appointments.complete', { aal2: true })
  const client = await createServerSupabaseClient()
  const personId = String(formData.get('person_id') ?? '')
  const appointmentId = String(formData.get('appointment_id') ?? '')
  const plaintext = String(formData.get('plaintext') ?? '')

  const rawHandoffType = String(formData.get('handoff_type') ?? '')
  let handoff: HandoffInput | undefined
  if (rawHandoffType) {
    if (!isHandoffTaskType(rawHandoffType)) throw new Error('HANDOFF_TYPE_INVALID')
    authorizeStaffPermission(session, 'tasks.create', { aal2: true })
    authorizeStaffPermission(session, 'tasks.assign', { aal2: true })

    const assignedToUserId = String(formData.get('handoff_assigned_to') ?? '')
    const rawDays = formData.get('handoff_follow_up_days')
    handoff = {
      type: rawHandoffType,
      assignedToUserId,
      followUpInDays: rawDays ? Number(rawDays) : undefined,
    }
  }

  const staffDirectory: Pick<StaffDirectoryRepository, 'findByUserId'> = {
    async findByUserId(userId) {
      const { data } = await client
        .from('profiles')
        .select('user_id, role, active')
        .eq('user_id', userId)
        .maybeSingle()
      if (!data) return null
      return { userId: data.user_id, role: data.role, active: data.active }
    },
  }

  const assigneeDirectory: AssigneeDirectory = {
    async isActiveSecretary(userId: string) {
      return isActiveStaffWithRole(userId, 'secretary', staffDirectory)
    },
  }

  const taskRepository: TaskRepository = {
    async insert(task: Task): Promise<void> {
      const { error } = await client.from('tasks').insert({
        id: task.id,
        type: task.type,
        title: task.title,
        created_by_user_id: task.createdByUserId,
        assigned_to_user_id: task.assignedToUserId,
        person_id: task.personId,
        appointment_id: task.appointmentId,
        due_at: task.dueAt,
      })
      if (error) throw new Error('HANDOFF_TASK_CREATE_FAILED')
    },
  }

  const repository = {
    async insert(input: ClinicalRecordInsert): Promise<ClinicalRecord> {
      const { data, error } = await client.rpc('create_clinical_record', {
        p_record_id: input.id,
        p_appointment_id: input.appointmentId,
        p_person_id: input.personId,
        p_author_user_id: input.authorUserId,
        p_ciphertext: input.ciphertext,
        p_iv: input.iv,
        p_auth_tag: input.authTag,
        p_key_version: input.keyVersion,
        ...(input.supersedesId ? { p_supersedes_id: input.supersedesId } : {}),
      })
      const record = data?.[0]
      if (error || !record) throw new Error('CLINICAL_RECORD_CREATE_FAILED')
      return {
        id: record.id,
        appointmentId: record.appointment_id,
        personId: record.person_id,
        authorUserId: record.author_user_id,
        ciphertext: record.ciphertext,
        iv: record.iv,
        authTag: record.auth_tag,
        keyVersion: record.key_version,
        supersedesId: record.supersedes_id ?? undefined,
        createdAt: record.created_at,
      }
    },
  }
  const audit = {
    async insert(event: AuditEvent): Promise<void> {
      const { error } = await client.from('audit_events').insert({
        actor_user_id: event.actorId,
        action: event.action,
        entity_type: event.entityType,
        entity_id: event.entityId,
        correlation_id: event.correlationId,
        metadata: event.metadata as Database['public']['Tables']['audit_events']['Insert']['metadata'],
        created_at: event.createdAt,
      })
      if (error) throw new Error('CLINICAL_AUDIT_FAILED')
    },
  }

  await completeAppointmentWithHandoff(
    { appointmentId, personId, authorUserId: authorizedSession.userId, plaintext, handoff },
    {
      crypto: createSensitiveDataCrypto(),
      repository,
      audit,
      taskRepository,
      assigneeDirectory,
    },
  )
  redirect(`/clinico/${personId}`)
}

export default async function ClinicalPersonPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params
  const session = await getStaffSession()
  if (!session) notFound()

  try {
    authorizeStaffSession(session, ['psychologist_owner'], { aal2: true })
  } catch (error) {
    if (error instanceof AuthorizationError && error.code === 'MFA_REQUIRED') {
      const returnTo = encodeURIComponent(`/clinico/${personId}`)
      redirect(`/seguranca?reason=mfa_required&returnTo=${returnTo}`)
    }
    notFound()
  }

  const client = await createServerSupabaseClient()
  const { data } = await client.rpc('list_clinical_record_metadata', { p_person_id: personId })
  const records = await listClinicalRecords(personId, {
    listMetadata: async () => (data ?? []).map((record) => ({
      id: record.id,
      appointmentId: record.appointment_id,
      personId: record.person_id,
      createdAt: record.created_at,
      supersedesId: record.supersedes_id ?? undefined,
    })),
  })

  const secretaries = await listActiveStaffByRole('secretary', {
    async listActiveByRole(role) {
      const { data: profiles } = await client
        .from('profiles')
        .select('user_id, display_name, active')
        .eq('role', role)
        .eq('active', true)
      return (profiles ?? []).map((profile) => ({ userId: profile.user_id, displayName: profile.display_name }))
    },
    async findByUserId() {
      return null
    },
  })

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Clínico</h1>
          <p>Registro psicológico protegido e versionado.</p>
        </div>
      </header>
      <section className="ui-card" aria-labelledby="clinical-timeline-title">
        <h2 id="clinical-timeline-title" className="ui-card__title">Linha do tempo</h2>
        <ClinicalTimeline records={records} />
      </section>
      <ClinicalRecordEditor personId={personId} action={completeAppointmentAction} secretaries={secretaries} />
    </>
  )
}
