import { randomUUID } from 'node:crypto'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { recordAuditEvent, type AuditEvent, type AuditEventRepository } from '@/modules/audit/public'
import {
  getClinicalRecord,
  serializeMedicalHistory,
  type ClinicalRecordEnvelope,
} from '@/modules/clinical/public'
import { ClinicalHistory, type ReadableClinicalRecord } from '@/modules/clinical/ui/clinical-history'
import { ClinicalSummary } from '@/modules/clinical/ui/clinical-summary'
import { MedicalHistoryPanel, type ReadableMedicalHistory } from '@/modules/clinical/ui/medical-history'
import {
  AuthorizationError,
  authorizeStaffPermission,
  getStaffSession,
} from '@/modules/identity/public'
import { createSensitiveDataCrypto } from '@/platform/crypto/aes-gcm'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import type { Database } from '@/platform/supabase/types'
import { PageHeader } from '@/shared/ui/page-header'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})

function auditRepository(client: Awaited<ReturnType<typeof createServerSupabaseClient>>): AuditEventRepository {
  return {
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
      if (error) throw new Error('MEDICAL_HISTORY_AUDIT_FAILED')
    },
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function requireClinicalWrite(personId: string, supersede: boolean) {
  const session = await getStaffSession()
  if (!session) notFound()
  try {
    const authorized = authorizeStaffPermission(session, 'clinical.create', { aal2: true })
    if (supersede) authorizeStaffPermission(session, 'clinical.supersede', { aal2: true })
    return authorized
  } catch {
    notFound()
  }
}

async function saveMedicalHistoryAction(formData: FormData) {
  'use server'
  const personId = String(formData.get('person_id') ?? '')
  const supersedesId = String(formData.get('supersedes_id') ?? '')
  if (!isUuid(personId) || (supersedesId && !isUuid(supersedesId))) notFound()

  const session = await requireClinicalWrite(personId, Boolean(supersedesId))
  const sourceType = String(formData.get('source_type') ?? 'clinician_review')
  if (sourceType !== 'clinician_review' && sourceType !== 'patient_signed_form_review') {
    throw new Error('MEDICAL_HISTORY_SOURCE_INVALID')
  }
  const sourceReferenceId = String(formData.get('source_reference_id') ?? '').trim()
  if (sourceReferenceId && !isUuid(sourceReferenceId)) throw new Error('MEDICAL_HISTORY_SOURCE_REFERENCE_INVALID')

  const plaintext = serializeMedicalHistory({
    conditions: String(formData.get('conditions') ?? ''),
    medications: String(formData.get('medications') ?? ''),
    allergies: String(formData.get('allergies') ?? ''),
    surgeries: String(formData.get('surgeries') ?? ''),
    familyHistory: String(formData.get('familyHistory') ?? ''),
    lifestyle: String(formData.get('lifestyle') ?? ''),
    involvedProfessionals: String(formData.get('involvedProfessionals') ?? ''),
    clinicalAlerts: String(formData.get('clinicalAlerts') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  })

  const id = randomUUID()
  const envelope = await createSensitiveDataCrypto().encrypt(plaintext, {
    entity: 'clinical-medical-history',
    id,
  })
  const client = await createServerSupabaseClient()
  const { data, error } = await client.rpc('create_medical_history', {
    p_record_id: id,
    p_person_id: personId,
    p_author_user_id: session.userId,
    p_ciphertext: envelope.ciphertext,
    p_iv: envelope.iv,
    p_auth_tag: envelope.authTag,
    p_key_version: envelope.keyVersion,
    p_source_type: sourceType,
    p_source_reference_id: sourceReferenceId || null,
    p_supersedes_id: supersedesId || null,
  })
  const saved = data?.[0]
  if (error || !saved) throw new Error('MEDICAL_HISTORY_SAVE_FAILED')

  await recordAuditEvent({
    actorId: session.userId,
    action: supersedesId ? 'medical_history.superseded' : 'medical_history.created',
    entityType: 'medical_history',
    entityId: id,
    correlationId: id,
    metadata: {
      personId,
      revision: saved.revision,
      sourceType,
      sourceReferenceId: sourceReferenceId || null,
    },
  }, auditRepository(client))

  redirect('/clinico/' + personId + '?history=saved')
}

async function requireClinicalRead(personId: string) {
  const session = await getStaffSession()
  if (!session) notFound()
  try {
    return authorizeStaffPermission(session, 'clinical.read', { aal2: true })
  } catch (error) {
    if (error instanceof AuthorizationError && error.code === 'MFA_REQUIRED') {
      redirect(`/seguranca?reason=mfa_required&returnTo=${encodeURIComponent(`/clinico/${personId}`)}`)
    }
    notFound()
  }
}

export default async function ClinicalPersonPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params
  await requireClinicalRead(personId)
  const client = await createServerSupabaseClient()

  const [
    { data: person, error: personError },
    { data: metadata, error: metadataError },
    { data: medicalMetadata, error: medicalMetadataError },
  ] = await Promise.all([
    client.from('people').select('id,civil_name,preferred_name,birth_date').eq('id', personId).maybeSingle(),
    client.rpc('list_clinical_record_metadata', { p_person_id: personId }),
    client.rpc('list_medical_history_metadata', { p_person_id: personId }),
  ])
  if (personError || !person) notFound()
  if (metadataError) throw new Error('CLINICAL_HISTORY_METADATA_FAILED')
  if (medicalMetadataError) throw new Error('MEDICAL_HISTORY_METADATA_FAILED')

  const crypto = createSensitiveDataCrypto()
  const records = await Promise.all((metadata ?? []).map(async (record): Promise<ReadableClinicalRecord> => {
    const decrypted = await getClinicalRecord(record.id, {
      crypto,
      reader: {
        async getEnvelope(id): Promise<ClinicalRecordEnvelope | null> {
          const { data, error } = await client.rpc('get_clinical_record_envelope', { record_id: id })
          const envelope = data?.[0]
          if (error || !envelope) return null
          return {
            id: envelope.id,
            appointmentId: envelope.appointment_id,
            personId: envelope.person_id,
            createdAt: envelope.created_at,
            supersedesId: envelope.supersedes_id ?? undefined,
            envelope: {
              alg: 'A256GCM',
              keyVersion: envelope.key_version,
              iv: envelope.iv,
              ciphertext: envelope.ciphertext,
              authTag: envelope.auth_tag,
            },
          }
        },
      },
    })
    return {
      id: decrypted.id,
      appointmentId: decrypted.appointmentId,
      createdAt: decrypted.createdAt,
      supersedesId: decrypted.supersedesId,
      plaintext: decrypted.plaintext,
    }
  }))

  const medicalHistories = await Promise.all((medicalMetadata ?? []).map(async (record): Promise<ReadableMedicalHistory> => {
    const { data, error } = await client.rpc('get_medical_history_envelope', { record_id: record.id })
    const envelope = data?.[0]
    if (error || !envelope) throw new Error('MEDICAL_HISTORY_ENVELOPE_FAILED')
    let plaintext: string
    try {
      plaintext = await crypto.decrypt({
        alg: 'A256GCM',
        keyVersion: envelope.key_version,
        iv: envelope.iv,
        ciphertext: envelope.ciphertext,
        authTag: envelope.auth_tag,
      }, {
        entity: 'clinical-medical-history',
        id: envelope.id,
      })
    } catch (error) {
      throw new Error('MEDICAL_HISTORY_INTEGRITY_ERROR', { cause: error })
    }
    return {
      id: envelope.id,
      personId: envelope.person_id,
      revision: envelope.revision,
      sourceType: envelope.source_type as ReadableMedicalHistory['sourceType'],
      sourceReferenceId: envelope.source_reference_id ?? undefined,
      supersedesId: envelope.supersedes_id ?? undefined,
      createdAt: envelope.created_at,
      plaintext,
    }
  }))

  const appointmentIds = [...new Set(records.map((record) => record.appointmentId))]
  const appointments = appointmentIds.length
    ? await client.from('appointments')
      .select('id,starts_at,status,service:services!appointments_service_id_fkey(name)')
      .in('id', appointmentIds)
    : { data: [], error: null }
  if (appointments.error) throw new Error('CLINICAL_HISTORY_APPOINTMENTS_FAILED')
  const labels = new Map((appointments.data ?? []).map((appointment) => [
    appointment.id,
    `${appointment.service?.name ?? 'Atendimento'} · ${dateTime.format(new Date(appointment.starts_at))}`,
  ]))
  const readable = records.map((record) => ({ ...record, appointmentLabel: labels.get(record.appointmentId) }))
  const inProgress = (appointments.data ?? []).find((appointment) => appointment.status === 'in_progress')
  const displayName = person.preferred_name || person.civil_name

  return <>
    <PageHeader
      title={`Prontuário · ${displayName}`}
      description="Histórico psicológico protegido, longitudinal e versionado."
      actions={<div className="page-actions">
        {inProgress ? <Link className="ui-button ui-button--primary" href={`/atendimentos/${inProgress.id}`}>Voltar ao atendimento</Link> : null}
        <Link className="ui-button ui-button--outline" href={`/pessoas/${person.id}`}>Ficha do paciente</Link>
      </div>}
    />

    <section className="ui-card" aria-labelledby="clinical-summary-title">
      <h2 id="clinical-summary-title" className="ui-card__title">Resumo clínico longitudinal</h2>
      <p className="ui-card__description">Informações de saúde e continuidade revisadas pela profissional. Conteúdo protegido por MFA e cifrado no prontuário.</p>
      <ClinicalSummary records={readable} medicalHistories={medicalHistories} />
    </section>

    <MedicalHistoryPanel personId={person.id} records={medicalHistories} action={saveMedicalHistoryAction} />

    <section className="ui-card" aria-labelledby="clinical-history-title">
      <h2 id="clinical-history-title" className="ui-card__title">Histórico clínico</h2>
      <p className="ui-card__description">Abra uma sessão para consultar sua evolução. Correções preservam as versões anteriores.</p>
      <ClinicalHistory records={readable} />
    </section>

    <section className="ui-card">
      <h2 className="ui-card__title">Novo registro de sessão</h2>
      <p>Registros de evolução são criados a partir da consulta correspondente na Agenda. Isso evita vínculos manuais e erros de identificação.</p>
      <Link className="ui-button ui-button--primary" href="/agenda">Abrir Agenda</Link>
    </section>
  </>
}
