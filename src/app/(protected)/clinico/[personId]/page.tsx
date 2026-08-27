import { notFound, redirect } from 'next/navigation'
import { authorizeStaffSession, AuthorizationError, getStaffSession } from '@/modules/identity/public'
import { createClinicalRecord, listClinicalRecords } from '@/modules/clinical/public'
import type { ClinicalRecord, ClinicalRecordInsert } from '@/modules/clinical/public'
import { ClinicalRecordEditor } from '@/modules/clinical/ui/clinical-record-editor'
import { ClinicalTimeline } from '@/modules/clinical/ui/clinical-timeline'
import { createSensitiveDataCrypto } from '@/platform/crypto/aes-gcm'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import type { AuditEvent } from '@/modules/audit/public'
import type { Database } from '@/platform/supabase/types'

export const dynamic = 'force-dynamic'

async function createClinicalRecordAction(formData: FormData) {
  'use server'

  const session = await getStaffSession()
  const authorizedSession = authorizeStaffSession(session, ['psychologist_owner'], { aal2: true })
  const client = await createServerSupabaseClient()
  const personId = String(formData.get('person_id') ?? '')
  const appointmentId = String(formData.get('appointment_id') ?? '')
  const plaintext = String(formData.get('plaintext') ?? '')

  const repository = {
    async insert(input: ClinicalRecordInsert): Promise<ClinicalRecord> {
      const { data, error } = await client.schema('clinical').from('records').insert({
        id: input.id,
        appointment_id: input.appointmentId,
        person_id: input.personId,
        author_user_id: input.authorUserId,
        ciphertext: input.ciphertext,
        iv: input.iv,
        auth_tag: input.authTag,
        key_version: input.keyVersion,
        supersedes_id: input.supersedesId ?? null,
      }).select('id, appointment_id, person_id, author_user_id, ciphertext, iv, auth_tag, key_version, supersedes_id, created_at').single()
      if (error || !data) throw new Error('CLINICAL_RECORD_CREATE_FAILED')
      return {
        id: data.id,
        appointmentId: data.appointment_id,
        personId: data.person_id,
        authorUserId: data.author_user_id,
        ciphertext: data.ciphertext,
        iv: data.iv,
        authTag: data.auth_tag,
        keyVersion: data.key_version,
        supersedesId: data.supersedes_id ?? undefined,
        createdAt: data.created_at,
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

  await createClinicalRecord({ appointmentId, personId, authorUserId: authorizedSession.userId, plaintext }, {
    crypto: createSensitiveDataCrypto(),
    repository,
    audit,
  })
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
      redirect('/login?reason=mfa_required')
    }
    notFound()
  }

  const client = await createServerSupabaseClient()
  const { data } = await client.schema('clinical').from('records')
    .select('id, appointment_id, person_id, author_user_id, ciphertext, iv, auth_tag, key_version, supersedes_id, created_at')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })
  const records = await listClinicalRecords(personId, {
    listMetadata: async () => (data ?? []).map((record) => ({
      id: record.id,
      appointmentId: record.appointment_id,
      personId: record.person_id,
      createdAt: record.created_at,
      supersedesId: record.supersedes_id ?? undefined,
    })),
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
      <ClinicalRecordEditor personId={personId} action={createClinicalRecordAction} />
    </>
  )
}
