import Link from 'next/link'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'
import { formatSaoPauloDateTimeLocal } from '@/modules/appointments/application/appointment-management'
import { createAppointmentAction, updateAppointmentAction } from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgendaManagementPage() {
  const client = await createServerSupabaseClient()
  const [{ data: people, error: peopleError }, { data: services, error: servicesError }, { data: appointments, error: appointmentsError }] = await Promise.all([
    client.from('people').select('id,civil_name,preferred_name').order('civil_name'),
    client.from('services').select('id,name,duration_minutes,active').eq('active', true).order('name'),
    client.from('appointments')
      .select('id,person_id,service_id,starts_at,ends_at,status,cancellation_deadline_at,person:people!appointments_person_id_fkey(civil_name,preferred_name),service:services!appointments_service_id_fkey(name)')
      .in('status', ['scheduled', 'confirmation_pending', 'confirmed', 'reschedule_requested'])
      .order('starts_at', { ascending: true })
      .limit(100),
  ])
  if (peopleError || servicesError || appointmentsError) throw new Error('AGENDA_MANAGEMENT_READ_FAILED')

  return <>
    <PageHeader title="Gerenciar agenda" description="Crie e reagende consultas com validação de conflito e política de cancelamento." />
    <p><Link href="/agenda">← Voltar para agenda</Link></p>
    <section aria-labelledby="new-appointment-heading"><h2 id="new-appointment-heading">Nova consulta</h2><form action={createAppointmentAction} className="stack-form">
      <label>Paciente<select name="person_id" required defaultValue=""><option value="" disabled>Selecione</option>{(people ?? []).map((person) => <option key={person.id} value={person.id}>{person.preferred_name || person.civil_name}</option>)}</select></label>
      <label>Serviço<select name="service_id" required defaultValue=""><option value="" disabled>Selecione</option>{(services ?? []).map((service) => <option key={service.id} value={service.id}>{service.name} ({service.duration_minutes} min)</option>)}</select></label>
      <label>Data e hora<input name="starts_at_local" type="datetime-local" required /></label><button type="submit">Criar consulta</button>
    </form></section>
    <section aria-labelledby="edit-appointment-heading"><h2 id="edit-appointment-heading">Editar ou reagendar</h2>{(appointments ?? []).length === 0 ? <p>Nenhuma consulta ativa encontrada.</p> : null}
      {(appointments ?? []).map((appointment) => <article key={appointment.id} className="card"><h3>{appointment.person?.preferred_name || appointment.person?.civil_name || 'Paciente'} — {appointment.service?.name || 'Consulta'}</h3><p>Status: <strong>{appointment.status}</strong></p><p>Prazo de cancelamento: {new Date(appointment.cancellation_deadline_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
        <form action={updateAppointmentAction} className="stack-form"><input type="hidden" name="appointment_id" value={appointment.id} /><label>Paciente<select name="person_id" required defaultValue={appointment.person_id}>{(people ?? []).map((person) => <option key={person.id} value={person.id}>{person.preferred_name || person.civil_name}</option>)}</select></label><label>Serviço<select name="service_id" required defaultValue={appointment.service_id}>{(services ?? []).map((service) => <option key={service.id} value={service.id}>{service.name} ({service.duration_minutes} min)</option>)}</select></label><label>Data e hora<input name="starts_at_local" type="datetime-local" required defaultValue={formatSaoPauloDateTimeLocal(appointment.starts_at)} /></label><button type="submit">Salvar alterações</button></form>
      </article>)}
    </section>
  </>
}
