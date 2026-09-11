import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  getClinicalRecord,
  type ClinicalRecordEnvelope,
} from '@/modules/clinical/public'
import { ClinicalHistory, type ReadableClinicalRecord } from '@/modules/clinical/ui/clinical-history'
import {
  AuthorizationError,
  authorizeStaffPermission,
  getStaffSession,
} from '@/modules/identity/public'
import { createSensitiveDataCrypto } from '@/platform/crypto/aes-gcm'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})

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

  const [{ data: person, error: personError }, { data: metadata, error: metadataError }] = await Promise.all([
    client.from('people').select('id,civil_name,preferred_name,birth_date').eq('id', personId).maybeSingle(),
    client.rpc('list_clinical_record_metadata', { p_person_id: personId }),
  ])
  if (personError || !person) notFound()
  if (metadataError) throw new Error('CLINICAL_HISTORY_METADATA_FAILED')

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
