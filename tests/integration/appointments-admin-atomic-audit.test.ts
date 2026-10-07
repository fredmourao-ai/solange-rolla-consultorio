import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const actions = readFileSync('src/app/(protected)/agenda/gerenciar/actions.ts', 'utf8')
const migration = readFileSync('supabase/migrations/20261006004600_appointments_admin_atomic_audit.sql', 'utf8')
const compatibilityMigration = readFileSync('supabase/migrations/20261006004800_appointments_legacy_snapshot_compat.sql', 'utf8')

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
    expect(migration.match(/security definer/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('closes direct authenticated appointment writes behind security-definer RPCs', () => {
    expect(migration).toContain('revoke insert, update, delete on public.appointments from authenticated')
    expect(migration).toContain('revoke insert, update, delete on public.appointment_status_history from authenticated')
  })

  it('requires reschedule permission when reschedule_requested advances even at the same time', () => {
    expect(migration).toContain("v_current.status = 'reschedule_requested'")
  })

  it('uses the same deterministic cancellation-policy tie-breaker as the RPC', () => {
    expect(actions).toContain(".order('effective_from', { ascending: false }).order('policy_version', { ascending: false })")
  })

  it('bounds cancellation deadline inputs before walking dates', () => {
    expect(compatibilityMigration).toContain('v_countable_hours > 8760')
    expect(compatibilityMigration).toContain('from (values (0), (1), (2), (3), (4), (5), (6)) as weekday(value)')
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
