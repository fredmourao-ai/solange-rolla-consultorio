import Link from 'next/link'
import { authorizeStaffSession, getStaffSession } from '@/modules/identity/public'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'
import { formatSaoPauloDateTimeLocal } from '@/modules/appointments/public'
import { createAppointmentAction, createServiceAction, updateAppointmentAction } from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AgendaManagementPage() {
  const session = await getStaffSession()
  authorizeStaffSession(session, ['psychologist_owner', 'secretary'])
  const client = await createServerSupabaseClient()
  const [{ data: people, error: peopleError }, { data: services, error: servicesError }, { data: appointments, error: appointmentsError }] = await Promise.all([
    client.from('people').select('id,civil_name,preferred_name').order('civil_name'),
    client.from('services').select('id,name,duration_minutes,active').eq('active', true).order('name'),
    client.from('appointments').select('id,person_id,service_id,starts_at,ends_at,status,cancellation_deadline_at,person:people!appointments_person_id_fkey(civil_name,preferred_name),service:services!appointments_service_id_fkey(name)').in('status', ['scheduled', 'pending_confirmation', 'confirmed', 'reschedule_requested', 'rescheduled']).order('starts_at', { ascending: true }).limit(100),
  ])
  if (peopleError || servicesError || appointmentsError) throw new Error('AGENDA_MANAGEMENT_READ_FAILED')
  return <><PageHeader title="Gerenciar agenda" description="Crie e reagende consultas com validação de conflito e política de cancelamento." /><p><Link href="/agenda">← Voltar para agenda</Link></p>
    <section aria-labelledby="service-setup-heading"><h2 id="service-setup-heading">Serviços</h2><p>Cadastre aqui os tipos de atendimento que poderão ser escolhidos ao criar uma consulta.</p><form action={createServiceAction} className="stack-form"><label>Nome do serviço<input name="name" required /></label><label>Duração em minutos<input name="duration_minutes" type="number" min="1" required /></label><label>Valor da consulta<input name="price" type="number" inputMode="decimal" min="0.01" step="0.01" required /></label><button type="submit">Cadastrar serviço</button></form></section>
    <section aria-labelledby="new-appointment-heading"><h2 id="new-appointment-heading">Nova consulta</h2><form action={createAppointmentAction} className="stack-form"><label>Paciente<select name="person_id" required defaultValue=""><option value="" disabled>Selecione</option>{(people ?? []).map((person) => <option key={person.id} value={person.id}>{person.preferred_name || person.civil_name}</option>)}</select></label><label>Serviço<select name="service_id" required defaultValue=""><option value="" disabled>Selecione</option>{(services ?? []).map((service) => <option key={service.id} value={service.id}>{service.name} ({service.duration_minutes} min)</option>)}</select></label><label>Data e hora<input name="starts_at_local" type="datetime-local" required /></label><button type="submit">Criar consulta</button></form></section>
    <section aria-labelledby="edit-appointment-heading"><h2 id="edit-appointment-heading">Editar ou reagendar</h2>{(appointments ?? []).length === 0 ? <p>Nenhuma consulta ativa encontrada.</p> : null}{(appointments ?? []).map((appointment) => <article key={appointment.id} className="card"><h3>{appointment.person?.preferred_name || appointment.person?.civil_name || 'Paciente'} — {appointment.service?.name || 'Consulta'}</h3><p>Status: <strong>{appointment.status}</strong></p><p>Prazo de cancelamento: {new Date(appointment.cancellation_deadline_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p><form action={updateAppointmentAction} className="stack-form"><input type="hidden" name="appointment_id" value={appointment.id} /><label>Paciente<select name="person_id" required defaultValue={appointment.person_id}>{(people ?? []).map((person) => <option key={person.id} value={person.id}>{person.preferred_name || person.civil_name}</option>)}</select></label><label>Serviço<select name="service_id" required defaultValue={appointment.service_id}>{(services ?? []).map((service) => <option key={service.id} value={service.id}>{service.name} ({service.duration_minutes} min)</option>)}</select></label><label>Data e hora<input name="starts_at_local" type="datetime-local" required defaultValue={formatSaoPauloDateTimeLocal(appointment.starts_at)} /></label><button type="submit">Salvar alterações</button></form></article>)}</section>
  </>
}
