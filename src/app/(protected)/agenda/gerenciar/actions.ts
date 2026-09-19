'use server'

import { redirect } from 'next/navigation'
import { calculateCancellationDeadline, createAppointment, normalizeCancellationPolicySnapshot, type Appointment, type AppointmentRepository, type CancellationPolicy } from '@/modules/appointments/public'
import { appointmentWindow, hasAppointmentConflict } from '@/modules/appointments/public'
import { authorizeStaffSession, getStaffSession } from '@/modules/identity/public'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import type { Database } from '@/platform/supabase/types'
import { parsePositiveMoneyToCents } from '@/shared/kernel/format/money'

async function authorizedClient() { const session = await getStaffSession(); authorizeStaffSession(session, ['psychologist_owner', 'secretary']); return createServerSupabaseClient() }
function moneyToCents(value: string) { try { return parsePositiveMoneyToCents(value) } catch { throw new Error('AGENDA_SERVICE_PRICE_INVALID') } }

export async function createServiceAction(formData: FormData) {
  const client = await authorizedClient()
  const name = String(formData.get('name') ?? '').trim()
  const durationMinutes = Number(formData.get('duration_minutes'))
  const priceCents = moneyToCents(String(formData.get('price') ?? ''))
  if (!name || !Number.isInteger(durationMinutes) || durationMinutes <= 0 || priceCents <= 0) throw new Error('AGENDA_SERVICE_INVALID')
  const { data, error } = await client.from('services').insert({ name, duration_minutes: durationMinutes, price_cents: priceCents, active: true }).select('id').single()
  if (error || !data) throw new Error('AGENDA_SERVICE_CREATE_FAILED')
  redirect('/agenda/gerenciar')
}

async function serviceWindow(client: Awaited<ReturnType<typeof createServerSupabaseClient>>, serviceId: string, startsAtLocal: string) { const { data: service, error } = await client.from('services').select('id,duration_minutes,active').eq('id', serviceId).single(); if (error || !service || !service.active) throw new Error('AGENDA_SERVICE_NOT_AVAILABLE'); return appointmentWindow(startsAtLocal, service.duration_minutes) }
async function assertNoConflict(client: Awaited<ReturnType<typeof createServerSupabaseClient>>, startsAt: Date, endsAt: Date, editingAppointmentId?: string) { const { data, error } = await client.from('appointments').select('id,starts_at,ends_at,status').lt('starts_at', endsAt.toISOString()).gt('ends_at', startsAt.toISOString()); if (error) throw new Error('AGENDA_CONFLICT_CHECK_FAILED'); const rows = (data ?? []).map((row) => ({ id: row.id, startsAt: row.starts_at, endsAt: row.ends_at, status: row.status })); if (hasAppointmentConflict({ startsAt, endsAt }, rows, editingAppointmentId)) throw new Error('AGENDA_TIME_CONFLICT') }
function policyFromRow(row: { policy_version: number; countable_hours: number; excluded_weekdays: unknown; business_timezone: string; late_cancellation_charge_enabled: boolean; no_show_charge_enabled: boolean }): CancellationPolicy { return { policyVersion: row.policy_version, countableHours: row.countable_hours, excludedWeekdays: Array.isArray(row.excluded_weekdays) ? row.excluded_weekdays.map(Number) : [], businessTimezone: row.business_timezone as 'America/Sao_Paulo', lateCancellationChargeEnabled: row.late_cancellation_charge_enabled, noShowChargeEnabled: row.no_show_charge_enabled } }

export async function createAppointmentAction(formData: FormData) {
  const client = await authorizedClient(); const personId = String(formData.get('person_id') ?? ''); const serviceId = String(formData.get('service_id') ?? ''); const startsAtLocal = String(formData.get('starts_at_local') ?? ''); const { startsAt, endsAt } = await serviceWindow(client, serviceId, startsAtLocal); await assertNoConflict(client, startsAt, endsAt)
  const { data: policyRow, error: policyError } = await client.from('cancellation_policies').select('policy_version,countable_hours,excluded_weekdays,business_timezone,late_cancellation_charge_enabled,no_show_charge_enabled,effective_from').lte('effective_from', startsAt.toISOString()).order('effective_from', { ascending: false }).limit(1).single(); if (policyError || !policyRow) throw new Error('AGENDA_POLICY_NOT_FOUND'); const policy = policyFromRow(policyRow); const id = crypto.randomUUID()
  const repository: AppointmentRepository = { async insert(input) { const { data, error } = await client.from('appointments').insert({ id: input.id, person_id: input.personId, service_id: input.serviceId, starts_at: input.startsAt.toISOString(), ends_at: input.endsAt.toISOString(), status: input.status, policy_version: input.policyVersion, cancellation_deadline_at: input.cancellationDeadlineAt, business_timezone: 'America/Sao_Paulo', cancellation_policy_snapshot: input.cancellationPolicySnapshot as unknown as Database['public']['Tables']['appointments']['Insert']['cancellation_policy_snapshot'] }).select('id,person_id,service_id,starts_at,ends_at,status,policy_version,cancellation_deadline_at,cancellation_policy_snapshot').single(); if (error || !data) throw new Error('AGENDA_CREATE_FAILED'); return { id: data.id, personId: data.person_id, serviceId: data.service_id, startsAt: data.starts_at, endsAt: data.ends_at, status: data.status as Appointment['status'], policyVersion: data.policy_version, cancellationDeadlineAt: data.cancellation_deadline_at, cancellationPolicy: normalizeCancellationPolicySnapshot(data.cancellation_policy_snapshot) } } }
  await createAppointment({ id, personId, serviceId, startsAt, endsAt, policy }, repository); redirect('/agenda/gerenciar')
}

export async function updateAppointmentAction(formData: FormData) {
  const client = await authorizedClient(); const appointmentId = String(formData.get('appointment_id') ?? ''); const personId = String(formData.get('person_id') ?? ''); const serviceId = String(formData.get('service_id') ?? ''); const startsAtLocal = String(formData.get('starts_at_local') ?? '')
  const { data: current, error: readError } = await client.from('appointments').select('id,person_id,service_id,starts_at,ends_at,status,policy_version,cancellation_policy_snapshot').eq('id', appointmentId).single(); if (readError || !current) throw new Error('AGENDA_APPOINTMENT_NOT_FOUND'); if (['cancelled_in_time', 'cancelled_late', 'cancelled_by_provider', 'completed', 'no_show'].includes(current.status)) throw new Error('AGENDA_TERMINAL_APPOINTMENT_IMMUTABLE')
  const { startsAt, endsAt } = await serviceWindow(client, serviceId, startsAtLocal); await assertNoConflict(client, startsAt, endsAt, appointmentId); const policy = normalizeCancellationPolicySnapshot(current.cancellation_policy_snapshot); const nextStatus = current.status === 'reschedule_requested' ? 'rescheduled' : current.status; const cancellationDeadlineAt = calculateCancellationDeadline(startsAt, policy).toISOString()
  const rpc = client.rpc.bind(client) as unknown as (name: 'update_appointment_schedule_atomic', args: {
    p_appointment_id: string; p_person_id: string; p_service_id: string; p_starts_at: string;
    p_ends_at: string; p_next_status: string; p_cancellation_deadline_at: string
  }) => PromiseLike<{ error: { code: string } | null }>
  const { error: updateError } = await rpc('update_appointment_schedule_atomic', {
    p_appointment_id: appointmentId,
    p_person_id: personId,
    p_service_id: serviceId,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt.toISOString(),
    p_next_status: nextStatus,
    p_cancellation_deadline_at: cancellationDeadlineAt,
  })
  if (updateError) throw new Error(`AGENDA_UPDATE_FAILED:${updateError.code}`)
  redirect('/agenda/gerenciar')
}
