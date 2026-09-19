import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  calendarRange,
  changeAppointmentStatus,
  availableAppointmentCommands,
  normalizeCancellationPolicySnapshot,
  type CalendarView,
  type Appointment,
  type AppointmentStatusRepository,
  type AppointmentCommand,
} from '@/modules/appointments/public'
import {
  buildAppointmentCharge,
  createReceivableIdempotent,
  type ReceivableRepository,
  type ChargeableAppointment,
} from '@/modules/receivables/public'
import { AppointmentCalendar, type AppointmentCalendarItem } from '@/modules/appointments/ui/calendar'
import {
  authorizeStaffPermission,
  getStaffSession,
  hasSessionPermission,
  type AppPermission,
  type StaffSession,
} from '@/modules/identity/public'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const dateOnly = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
})

function normalizeView(value?: string): CalendarView {
  return value === 'day' || value === 'month' ? value : 'week'
}

function normalizeDate(value?: string): string {
  const fallback = dateOnly.format(new Date())
  if (!value) return fallback
  try { calendarRange('day', value); return value } catch { return fallback }
}

function permissionForCommand(command: AppointmentCommand): AppPermission {
  switch (command) {
    case 'send_confirmation':
    case 'confirm':
      return 'appointments.confirm'
    case 'check_in':
      return 'appointments.checkin'
    case 'request_reschedule':
    case 'reschedule':
      return 'appointments.reschedule'
    case 'cancel_in_time':
    case 'cancel_late':
    case 'cancel_by_provider':
      return 'appointments.cancel'
    case 'mark_no_show':
      return 'appointments.no_show'
    case 'complete':
      return 'appointments.complete'
    case 'start':
      return 'clinical.create'
  }
}

function commandsFor(session: StaffSession, status: Appointment['status']) {
  return availableAppointmentCommands(status).filter((command) => hasSessionPermission(session, permissionForCommand(command)))
}


function redirectBackTo(formData: FormData): string {
  const value = String(formData.get('redirect_to') ?? '')
  return value.startsWith('/agenda') ? value : '/agenda'
}

async function changeAppointmentStatusAction(formData: FormData) {
  'use server'
  const command = String(formData.get('command') ?? '') as AppointmentCommand
  const permission = permissionForCommand(command)
  const session = await getStaffSession()
  const authorized = authorizeStaffPermission(session, permission)
  const client = await createServerSupabaseClient()
  const appointmentId = String(formData.get('appointment_id') ?? '')
  const redirectTo = redirectBackTo(formData)

  const { data: row, error: readError } = await client
    .from('appointments')
    .select('id,person_id,service_id,starts_at,ends_at,status,policy_version,cancellation_deadline_at,cancellation_policy_snapshot')
    .eq('id', appointmentId)
    .single()
  if (readError || !row) throw new Error('AGENDA_APPOINTMENT_NOT_FOUND')

  const appointment: Appointment = {
    id: row.id,
    personId: row.person_id,
    serviceId: row.service_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status as Appointment['status'],
    policyVersion: row.policy_version,
    cancellationDeadlineAt: row.cancellation_deadline_at,
    cancellationPolicy: normalizeCancellationPolicySnapshot(row.cancellation_policy_snapshot),
  }

  const repository: AppointmentStatusRepository = {
    async updateStatus(id, status) {
      const rpc = client.rpc.bind(client) as unknown as (name: 'change_appointment_status_atomic', args: {
        p_appointment_id: string; p_expected_status: string; p_next_status: string; p_command: string
      }) => PromiseLike<{ error: { code: string } | null }>
      const { error: mutationError } = await rpc('change_appointment_status_atomic', {
        p_appointment_id: id,
        p_expected_status: appointment.status,
        p_next_status: status,
        p_command: command,
      })
      if (mutationError) throw new Error(`AGENDA_STATUS_UPDATE_FAILED:${mutationError.code}`)
      const { data, error } = await client.from('appointments')
        .select('id,person_id,service_id,starts_at,ends_at,status,policy_version,cancellation_deadline_at,cancellation_policy_snapshot')
        .eq('id', id)
        .single()
      if (error || !data) throw new Error('AGENDA_STATUS_RELOAD_FAILED')
      return {
        id: data.id,
        personId: data.person_id,
        serviceId: data.service_id,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
        status: data.status as Appointment['status'],
        policyVersion: data.policy_version,
        cancellationDeadlineAt: data.cancellation_deadline_at,
        cancellationPolicy: normalizeCancellationPolicySnapshot(data.cancellation_policy_snapshot),
      }
    },
  }

  await changeAppointmentStatus(appointment, command, repository)

  redirect(redirectTo)
}

async function chargeAppointmentAction(formData: FormData) {
  'use server'
  const session = await getStaffSession()
  authorizeStaffPermission(session, 'finance.receive')
  const client = await createServerSupabaseClient()
  const appointmentId = String(formData.get('appointment_id') ?? '')
  const redirectTo = redirectBackTo(formData)

  const { data: row, error: readError } = await client
    .from('appointments')
    .select('id,person_id,status,cancellation_policy_snapshot,service:services!appointments_service_id_fkey(price_cents)')
    .eq('id', appointmentId)
    .single()
  if (readError || !row) throw new Error('AGENDA_APPOINTMENT_NOT_FOUND')
  if (row.status !== 'no_show' && row.status !== 'cancelled_late') throw new Error('AGENDA_APPOINTMENT_NOT_CHARGEABLE')

  const policy = normalizeCancellationPolicySnapshot(row.cancellation_policy_snapshot)
  const chargeable: ChargeableAppointment = {
    id: row.id,
    status: row.status,
    personId: row.person_id,
    payerPersonId: row.person_id,
    noShowChargeEnabled: policy.noShowChargeEnabled,
    lateCancellationChargeEnabled: policy.lateCancellationChargeEnabled,
  }
  const servicePriceCents = row.service?.price_cents
  if (typeof servicePriceCents !== 'number' || !Number.isInteger(servicePriceCents) || servicePriceCents <= 0) {
    throw new Error('AGENDA_SERVICE_PRICE_INVALID')
  }
  const charge = buildAppointmentCharge(chargeable, servicePriceCents)

  if (charge) {
    const repository: ReceivableRepository = {
      async findByIdempotencyKey(key) {
        const { data, error } = await client.from('receivables')
          .select('id,source_type,source_id,person_id,payer_person_id,original_amount_cents')
          .eq('idempotency_key', key)
          .maybeSingle()
        if (error) throw new Error('AGENDA_CHARGE_LOOKUP_FAILED')
        if (!data) return null
        return {
          id: data.id,
          sourceType: data.source_type,
          sourceId: data.source_id,
          personId: data.person_id,
          payerPersonId: data.payer_person_id,
          originalAmountCents: data.original_amount_cents,
          adjustmentCents: 0,
          paidCents: 0,
        }
      },
      async insert(receivable) {
        const rpc = client.rpc.bind(client) as unknown as (name: 'create_appointment_charge_atomic', args: {
          p_appointment_id: string; p_amount_cents: number; p_idempotency_key: string
        }) => PromiseLike<{ data: string | null; error: { code: string } | null }>
        const { data: id, error } = await rpc('create_appointment_charge_atomic', {
          p_appointment_id: appointmentId,
          p_amount_cents: receivable.originalAmountCents,
          p_idempotency_key: receivable.idempotencyKey,
        })
        if (error || !id) throw new Error(`AGENDA_CHARGE_CREATE_FAILED:${error?.code ?? 'unknown'}`)
        return {
          id,
          sourceType: receivable.sourceType,
          sourceId: receivable.sourceId,
          personId: receivable.personId,
          payerPersonId: receivable.payerPersonId,
          originalAmountCents: receivable.originalAmountCents,
          adjustmentCents: 0,
          paidCents: 0,
        }
      },
    }
    await createReceivableIdempotent(charge, repository)
  }

  redirect(redirectTo)
}

export default async function AgendaPage({ searchParams }: {
  searchParams: Promise<{ view?: string; date?: string }>
}) {
  const session = await getStaffSession()
  if (!session) redirect('/login')
  authorizeStaffPermission(session, 'appointments.read')

  const query = await searchParams
  const view = normalizeView(query.view)
  const anchor = normalizeDate(query.date)
  const range = calendarRange(view, anchor)
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('appointments')
    .select('id,person_id,starts_at,ends_at,status,cancellation_deadline_at,cancellation_policy_snapshot,person:people!appointments_person_id_fkey(civil_name,preferred_name),service:services!appointments_service_id_fkey(name)')
    .gte('starts_at', range.from.toISOString())
    .lt('starts_at', range.to.toISOString())
    .order('starts_at', { ascending: true })

  if (error) throw new Error('AGENDA_READ_FAILED')

  const redirectTo = `/agenda?view=${view}&date=${anchor}`
  const items: AppointmentCalendarItem[] = (data ?? []).map((row) => {
    const policy = normalizeCancellationPolicySnapshot(row.cancellation_policy_snapshot)
    return {
      id: row.id,
      personId: row.person_id,
      patientName: row.person?.preferred_name || row.person?.civil_name || 'Paciente',
      serviceName: row.service?.name || 'Consulta',
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status as AppointmentCalendarItem['status'],
      cancellationDeadlineAt: row.cancellation_deadline_at,
      availableCommands: commandsFor(session, row.status as Appointment['status']),
      chargeable: hasSessionPermission(session, 'finance.receive') && (
        row.status === 'no_show'
          ? policy.noShowChargeEnabled
          : row.status === 'cancelled_late'
            ? policy.lateCancellationChargeEnabled
            : false
      ),
      canOpenPatient: hasSessionPermission(session, 'patients.read'),
      canStartCare: hasSessionPermission(session, 'clinical.create') && session.role === 'psychologist_owner' && session.aal === 'aal2',
    }
  })

  return <>
    <PageHeader
      title="Agenda"
      description="Consultas, confirmações e rotina de atendimento no horário de Brasília."
      actions={hasSessionPermission(session, 'appointments.create')
        ? <Link className="ui-button ui-button--primary" href={`/agenda/gerenciar?date=${anchor}`}>Nova consulta</Link>
        : undefined}
    />
    <nav className="calendar-view-switch" aria-label="Visualização da agenda">
      <Link aria-current={view === 'day' ? 'page' : undefined} href={`/agenda?view=day&date=${anchor}`}>Dia</Link>
      <Link aria-current={view === 'week' ? 'page' : undefined} href={`/agenda?view=week&date=${anchor}`}>Semana</Link>
      <Link aria-current={view === 'month' ? 'page' : undefined} href={`/agenda?view=month&date=${anchor}`}>Mês</Link>
    </nav>
    <p className="calendar-anchor"><strong>Data de referência:</strong> {anchor.split('-').reverse().join('/')}</p>
    <AppointmentCalendar
      items={items}
      redirectTo={redirectTo}
      changeStatusAction={changeAppointmentStatusAction}
      chargeAction={chargeAppointmentAction}
    />
  </>
}
