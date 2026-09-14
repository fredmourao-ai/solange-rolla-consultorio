import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { authorizeStaffPermission, getStaffSession, hasSessionPermission } from '@/modules/identity/public'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const appointmentLabels: Record<string, string> = {
  scheduled: 'Agendada',
  pending_confirmation: 'Aguardando confirmação',
  confirmed: 'Confirmada',
  reschedule_requested: 'Reagendamento solicitado',
  rescheduled: 'Reagendada',
  cancelled_in_time: 'Cancelada no prazo',
  cancelled_late: 'Cancelada fora do prazo',
  completed: 'Realizada',
  no_show: 'Faltou',
  cancelled_by_provider: 'Cancelada pelo consultório',
}

const relationshipLabels: Record<string, string> = {
  legal_guardian: 'Responsável legal',
  financial_responsible: 'Responsável financeiro',
  fiscal_taker: 'Tomador fiscal',
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
}

function ageFrom(date: string) {
  const birth = new Date(`${date}T12:00:00Z`)
  const now = new Date()
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday = now.getUTCMonth() < birth.getUTCMonth()
    || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return Math.max(0, age)
}

function fiscalReady(cpf: string | null, fiscalAddress: unknown) {
  if (!cpf || !fiscalAddress || typeof fiscalAddress !== 'object' || Array.isArray(fiscalAddress)) return false
  const address = fiscalAddress as Record<string, unknown>
  return ['street', 'number', 'district', 'city', 'state', 'postalCode'].every((key) => Boolean(String(address[key] ?? '').trim()))
}

async function getRequestTimestamp() {
  return Date.now()
}

export default async function PatientHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { personId } = await params
  const session = await getStaffSession()
  if (!session) redirect('/login')
  authorizeStaffPermission(session, 'patients.read')

  const client = await createServerSupabaseClient()
  const { data: person, error: personError } = await client.from('people')
    .select('id,civil_name,preferred_name,birth_date,cpf_normalized,email_normalized,phone_e164,preferred_channel,birthday_messages_enabled,fiscal_address')
    .eq('id', personId)
    .maybeSingle()
  if (personError || !person) notFound()

  const canUpdate = hasSessionPermission(session, 'patients.update')
  const canAppointments = hasSessionPermission(session, 'appointments.read')
  const canCreateAppointment = hasSessionPermission(session, 'appointments.create')
  const canClinical = hasSessionPermission(session, 'clinical.read') && session.aal === 'aal2'
  const canForms = hasSessionPermission(session, 'forms.read')
  const canDocuments = hasSessionPermission(session, 'documents.read')
  const canFinance = hasSessionPermission(session, 'finance.read')
  const canMessaging = hasSessionPermission(session, 'messaging.read')

  let appointments: Array<{ id: string; service_id: string; starts_at: string; status: string }> = []
  let services = new Map<string, string>()
  if (canAppointments) {
    const { data, error } = await client.from('appointments')
      .select('id,service_id,starts_at,status')
      .eq('person_id', personId)
      .order('starts_at', { ascending: false })
      .limit(100)
    if (error) throw new Error('PATIENT_APPOINTMENTS_LOAD_FAILED')
    appointments = data ?? []
    const serviceIds = [...new Set(appointments.map((appointment) => appointment.service_id))]
    if (serviceIds.length) {
      const { data: serviceRows, error: serviceError } = await client.from('services').select('id,name').in('id', serviceIds)
      if (serviceError) throw new Error('PATIENT_SERVICES_LOAD_FAILED')
      services = new Map((serviceRows ?? []).map((service) => [service.id, service.name]))
    }
  }

  const relationships = hasSessionPermission(session, 'patients.relationships.manage') || hasSessionPermission(session, 'patients.read')
    ? await client.from('person_relationships').select('related_person_id,relationship_kind').eq('person_id', personId)
    : { data: [], error: null }
  if (relationships.error) throw new Error('PATIENT_RELATIONSHIPS_LOAD_FAILED')
  const relatedIds = [...new Set((relationships.data ?? []).map((relationship) => relationship.related_person_id))]
  const relatedPeople = relatedIds.length
    ? await client.from('people').select('id,civil_name,preferred_name').in('id', relatedIds)
    : { data: [], error: null }
  if (relatedPeople.error) throw new Error('PATIENT_RELATED_PEOPLE_LOAD_FAILED')
  const relatedName = new Map((relatedPeople.data ?? []).map((candidate) => [candidate.id, candidate.preferred_name || candidate.civil_name]))

  let receivables: Array<{ id: string; status: string; original_amount_cents: number }> = []
  if (canFinance) {
    const { data, error } = await client.from('receivables')
      .select('id,status,original_amount_cents')
      .eq('person_id', personId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw new Error('PATIENT_FINANCE_LOAD_FAILED')
    receivables = data ?? []
  }

  const now = await getRequestTimestamp()
  const ascending = [...appointments].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  const nextAppointment = ascending.find((appointment) => Date.parse(appointment.starts_at) >= now && !appointment.status.startsWith('cancelled'))
  const previousAppointment = [...ascending].reverse().find((appointment) => Date.parse(appointment.starts_at) < now)
  const completed = appointments.filter((appointment) => appointment.status === 'completed').length
  const displayName = person.preferred_name || person.civil_name
  const search = await searchParams
  const fiscalComplete = fiscalReady(person.cpf_normalized, person.fiscal_address)

  return <>
    <PageHeader
      title={displayName}
      description={`${ageFrom(person.birth_date)} anos · Ficha do paciente`}
      actions={<div className="page-actions">
        {canCreateAppointment ? <Link className="ui-button ui-button--primary" href={`/agenda/gerenciar?personId=${person.id}`}>Nova consulta</Link> : null}
        {canUpdate ? <Link className="ui-button ui-button--outline" href={`/pessoas/${person.id}/gerenciar`}>Editar cadastro</Link> : null}
        {canClinical ? <Link className="ui-button ui-button--secondary" href={`/clinico/${person.id}`}>Abrir prontuário</Link> : null}
      </div>}
    />

    {search.status === 'updated' ? <p role="status" className="status-badge status-badge--success">Cadastro atualizado.</p> : null}

    <div className="dashboard-grid patient-hub__summary">
      <section className="ui-card">
        <h2 className="ui-card__title">Contato</h2>
        <p>{person.phone_e164 ?? 'Telefone não informado'}</p>
        <p>{person.email_normalized ?? 'E-mail não informado'}</p>
        <p>Canal preferido: {person.preferred_channel === 'none' ? 'não definido' : person.preferred_channel}</p>
      </section>
      <section className="ui-card">
        <h2 className="ui-card__title">Agenda</h2>
        <p><strong>Próxima:</strong> {nextAppointment ? dateTime(nextAppointment.starts_at) : 'Não agendada'}</p>
        <p><strong>Última:</strong> {previousAppointment ? dateTime(previousAppointment.starts_at) : 'Sem atendimento anterior'}</p>
        <p><strong>Sessões realizadas:</strong> {completed}</p>
      </section>
      <section className="ui-card">
        <h2 className="ui-card__title">Cadastro</h2>
        <p>CPF: {person.cpf_normalized ?? 'Não informado'}</p>
        <p>{fiscalComplete ? 'Dados fiscais completos' : 'Dados fiscais incompletos'}</p>
        <p>Aniversário: {person.birthday_messages_enabled ? 'mensagem autorizada' : 'sem envio automático'}</p>
      </section>
    </div>

    <nav className="patient-hub__tabs" aria-label="Áreas da ficha do paciente">
      <a href="#consultas">Consultas</a>
      <a href="#responsaveis">Responsáveis</a>
      {canForms ? <a href="#formularios">Formulários</a> : null}
      {canDocuments ? <a href="#documentos">Documentos</a> : null}
      {canFinance ? <a href="#financeiro">Financeiro</a> : null}
      {canMessaging ? <a href="#comunicacao">Comunicação</a> : null}
      {canClinical ? <Link href={`/clinico/${person.id}`}>Prontuário</Link> : null}
    </nav>

    <section id="consultas" className="ui-card">
      <h2 className="ui-card__title">Consultas</h2>
      {!canAppointments ? <p>Você não tem acesso à agenda deste paciente.</p> : appointments.length === 0 ? <p className="empty-state">Nenhuma consulta registrada.</p> : <ul className="patient-hub__list">
        {appointments.slice(0, 12).map((appointment) => <li key={appointment.id}>
          <div>
            <strong>{dateTime(appointment.starts_at)}</strong>
            <span>{services.get(appointment.service_id) ?? 'Atendimento'}</span>
          </div>
          <span className="status-badge">{appointmentLabels[appointment.status] ?? 'Situação atual'}</span>
          <Link className="ui-button ui-button--outline" href={`/agenda?date=${appointment.starts_at.slice(0, 10)}`}>Ver na agenda</Link>
        </li>)}
      </ul>}
    </section>

    <section id="responsaveis" className="ui-card">
      <h2 className="ui-card__title">Responsáveis e vínculos</h2>
      {(relationships.data ?? []).length === 0 ? <p className="empty-state">Nenhum vínculo cadastrado.</p> : <ul className="patient-hub__list">
        {(relationships.data ?? []).map((relationship) => <li key={`${relationship.relationship_kind}:${relationship.related_person_id}`}>
          <strong>{relationshipLabels[relationship.relationship_kind] ?? 'Vínculo'}</strong>
          <span>{relatedName.get(relationship.related_person_id) ?? 'Cadastro relacionado'}</span>
        </li>)}
      </ul>}
    </section>

    {canForms ? <section id="formularios" className="ui-card">
      <h2 className="ui-card__title">Formulários</h2>
      <p>Consulte e envie formulários pré-atendimento a partir desta ficha.</p>
      <Link className="ui-button ui-button--outline" href="/formularios">Abrir formulários</Link>
    </section> : null}

    {canDocuments ? <section id="documentos" className="ui-card">
      <h2 className="ui-card__title">Documentos</h2>
      <p>Documentos administrativos e assinados ficam acessíveis conforme sua autorização.</p>
    </section> : null}

    {canFinance ? <section id="financeiro" className="ui-card">
      <h2 className="ui-card__title">Financeiro</h2>
      {receivables.length === 0 ? <p className="empty-state">Nenhum recebível registrado.</p> : <ul className="patient-hub__list">
        {receivables.slice(0, 8).map((receivable) => <li key={receivable.id}>
          <span>R$ {(Number(receivable.original_amount_cents) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <span className="status-badge">{receivable.status === 'paid' ? 'Pago' : receivable.status === 'partial' ? 'Parcial' : 'Pendente'}</span>
        </li>)}
      </ul>}
      <Link className="ui-button ui-button--outline" href="/financeiro">Abrir financeiro</Link>
    </section> : null}

    {canMessaging ? <section id="comunicacao" className="ui-card">
      <h2 className="ui-card__title">Comunicação</h2>
      <p>Preferência atual: {person.preferred_channel === 'none' ? 'nenhum canal definido' : person.preferred_channel}.</p>
    </section> : null}
  </>
}
