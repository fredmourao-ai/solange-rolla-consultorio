import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const agenda = readFileSync('src/app/(protected)/agenda/page.tsx', 'utf8')
const care = readFileSync('src/app/(clinical)/atendimentos/[appointmentId]/page.tsx', 'utf8')
const migration = readFileSync('supabase/migrations/20261006004700_appointment_transition_atomic_audit.sql', 'utf8')
const domain = readFileSync('src/modules/appointments/domain/status.ts', 'utf8')

describe('appointment status transition atomic boundary', () => {
  it('routes agenda and clinical transition callers through the atomic RPC', () => {
    expect(agenda).toContain("client.rpc('transition_appointment_status_atomic'")
    expect(care.match(/client\.rpc\('transition_appointment_status_atomic'/g)?.length).toBe(2)
    expect(agenda).not.toContain("client.from('appointment_status_history').insert")
    expect(care).not.toContain("client.from('appointment_status_history').insert")
  })

  it('does not duplicate appointment transition audit in application callers', () => {
    expect(agenda).not.toContain("action: 'appointment.status_changed'")
    expect(care).not.toContain("action: 'appointment.care_started'")
    expect(care).not.toContain("action: 'appointment.care_completed'")
    expect(migration).toContain("'appointment.status_changed'")
    expect(migration).toContain("'appointment.care_started'")
    expect(migration).toContain("'appointment.care_completed'")
  })

  it('keeps every TypeScript transition command represented in the SQL transition boundary', () => {
    for (const command of [
      'send_confirmation',
      'confirm',
      'check_in',
      'start',
      'request_reschedule',
      'reschedule',
      'cancel_in_time',
      'cancel_late',
      'complete',
      'mark_no_show',
      'cancel_by_provider',
    ]) {
      expect(domain).toContain(`'${command}'`)
      expect(migration).toContain(`p_command = '${command}'`)
    }
  })

  it('keeps agenda transitions role-scoped even when permission overrides exist', () => {
    expect(migration).toContain("coalesce(v_role, '') not in ('psychologist_owner', 'secretary')")
    expect(migration).toContain('not coalesce(public.has_permission(v_permission), false)')
  })

  it('enforces permission mapping and owner AAL2 for care start inside SQL', () => {
    expect(migration).toContain('not coalesce(public.has_permission(v_permission), false)')
    expect(migration).toContain("v_role is distinct from 'psychologist_owner'")
    expect(migration).toContain("public.current_aal() is distinct from 'aal2'")
    expect(migration).toContain('for update')
  })

  it('requires owner AAL2 and clinical.create for both start and complete', () => {
    expect(migration).toContain("p_command = 'start'")
    expect(migration).toContain("p_command = 'complete'")
    expect(migration).toContain("not coalesce(public.has_permission('clinical.create'), false)")
    expect(migration).toContain("'CARE_COMPLETE_FORBIDDEN'")
  })

  it('classifies cancellation and no-show timing inside the authoritative SQL boundary', () => {
    expect(migration).toContain("'AGENDA_CANCELLATION_WINDOW_MISMATCH'")
    expect(migration).toContain("'AGENDA_NO_SHOW_TOO_EARLY'")
    expect(migration).toContain('v_current.cancellation_deadline_at')
    expect(migration).toContain('v_current.starts_at')
  })

  it('does not offer impossible cancellation or no-show commands in the agenda UI', () => {
    expect(agenda).toContain('Date.parse(appointment.cancellationDeadlineAt)')
    expect(agenda).toContain('Date.parse(appointment.startsAt)')
    expect(agenda).toContain("command === 'cancel_in_time' || command === 'cancel_late'")
    expect(agenda).toContain("command === 'mark_no_show'")
  })

  it('preserves authoritative timing errors for agenda callers', () => {
    expect(agenda).toContain("'AGENDA_CANCELLATION_WINDOW_MISMATCH'")
    expect(agenda).toContain("'AGENDA_NO_SHOW_TOO_EARLY'")
  })
})
