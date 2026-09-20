import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const agenda = readFileSync('src/app/(protected)/agenda/page.tsx', 'utf8')
const care = readFileSync('src/app/(clinical)/atendimentos/[appointmentId]/page.tsx', 'utf8')
const migration = readFileSync('supabase/migrations/20260919224000_appointment_transition_atomic_audit.sql', 'utf8')
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

  it('enforces permission mapping and owner AAL2 for care start inside SQL', () => {
    expect(migration).toContain("not public.has_permission(v_permission)")
    expect(migration).toContain("public.current_app_role() <> 'psychologist_owner'")
    expect(migration).toContain("public.current_aal() <> 'aal2'")
    expect(migration).toContain('for update')
  })
})
