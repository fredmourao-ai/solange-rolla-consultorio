import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const actions = readFileSync('src/app/(protected)/agenda/gerenciar/actions.ts', 'utf8')
const migration = readFileSync('supabase/migrations/20260919223000_appointments_admin_atomic_audit.sql', 'utf8')

describe('appointment admin atomic audit contract', () => {
  it('routes create and update through atomic RPCs without application audit writes', () => {
    expect(actions).toContain("client.rpc('create_appointment_with_audit_atomic'")
    expect(actions).toContain("client.rpc('update_appointment_with_audit_atomic'")
    expect(actions).not.toContain("recordAuditEvent")
    expect(actions).not.toContain("client.from('audit_events')")
    expect(actions).not.toContain("client.from('appointment_status_history').insert")
    expect(actions).not.toContain("client.from('appointments').update")
  })

  it('serializes the calendar conflict check inside the same transaction', () => {
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended('solange:appointment-calendar', 0))")
    expect(migration).toContain("a.status not in ('cancelled_in_time', 'cancelled_late', 'cancelled_by_provider')")
    expect(migration).toContain("raise exception 'AGENDA_TIME_CONFLICT'")
  })

  it('writes appointment, status history and audit inside the database boundary', () => {
    expect(migration).toContain('insert into public.appointments')
    expect(migration).toContain('insert into public.appointment_status_history')
    expect(migration).toContain('insert into public.audit_events')
    expect(migration).toContain("'appointment.created'")
    expect(migration).toContain("'appointment.updated'")
    expect(migration).toContain('security invoker')
  })

  it('enforces effective permissions and server-side scheduling invariants', () => {
    expect(migration).toContain("public.has_permission('appointments.create')")
    expect(migration).toContain("public.has_permission('appointments.update')")
    expect(migration).toContain("public.has_permission('appointments.reschedule')")
    expect(migration).toContain("'AGENDA_SERVICE_DURATION_MISMATCH'")
    expect(migration).toContain("'AGENDA_POLICY_VERSION_INVALID'")
    expect(migration).toContain("'AGENDA_POLICY_SNAPSHOT_INVALID'")
    expect(migration).toContain("'AGENDA_CANCELLATION_DEADLINE_INVALID'")
    expect(migration).toContain('appointment_cancellation_deadline_from_snapshot')
  })
})
