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
