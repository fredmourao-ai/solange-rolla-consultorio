import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { signInDemo } from './demo-auth'

const dbUrl = process.env.DB_URL ?? ''
if (!dbUrl) throw new Error('local Supabase DB_URL is required')

function sql(statement: string): string {
  return execFileSync('psql', [dbUrl, '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement], { encoding: 'utf8' }).trim()
}
function quote(value: string): string { return `'${value.replaceAll("'", "''")}'` }

const snapshot = { policyVersion: 1, countableHours: 48, excludedWeekdays: [6, 0], businessTimezone: 'America/Sao_Paulo', lateCancellationChargeEnabled: true, noShowChargeEnabled: true }

function appointment(status: string, startsAtIso: string) {
  const id = randomUUID()
  sql(`insert into public.appointments
    (id,person_id,service_id,starts_at,ends_at,status,policy_version,cancellation_deadline_at,business_timezone,cancellation_policy_snapshot)
    values (${quote(id)},'d0000000-0000-4000-8000-000000000001','d0200000-0000-4000-8000-000000000001',
      ${quote(startsAtIso)}::timestamptz,(${quote(startsAtIso)}::timestamptz + interval '50 minutes'),
      ${quote(status)},1,'2030-01-01T12:00:00Z'::timestamptz,'America/Sao_Paulo',${quote(JSON.stringify(snapshot))}::jsonb)`)
  return id
}

test('staff marks a past confirmed appointment as a no-show from the agenda', async ({ page }) => {
  const appointmentId = appointment('confirmed', '2020-01-06T15:00:00-03:00')
  await signInDemo(page)
  await page.goto('/agenda?view=day&date=2020-01-06', { waitUntil: 'domcontentloaded' })
  await page.getByText('Ver detalhes').first().click()
  await page.getByRole('combobox', { name: 'Alterar status' }).selectOption('mark_no_show')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect.poll(() => sql(`select status from public.appointments where id=${quote(appointmentId)}`)).toBe('no_show')
  await expect.poll(() => sql(`select count(*) from public.audit_events where action='appointment.status_changed' and correlation_id=${quote(appointmentId)}`)).toBe('1')
})

test('staff charges a no-show for the full service price, auditable and idempotent', async ({ page }) => {
  const appointmentId = appointment('no_show', '2020-01-07T15:00:00-03:00')
  await signInDemo(page)
  await page.goto('/agenda?view=day&date=2020-01-07', { waitUntil: 'domcontentloaded' })
  await page.getByText('Ver detalhes').first().click()
  await page.getByRole('button', { name: 'Cobrar falta/cancelamento fora do prazo' }).click()

  const receivableQuery = `select source_type,source_id,person_id,payer_person_id,original_amount_cents from public.receivables where idempotency_key=${quote(`appointment:${appointmentId}:charge`)}`
  await expect.poll(() => sql(receivableQuery)).toBe(`appointment|${appointmentId}|d0000000-0000-4000-8000-000000000001|d0000000-0000-4000-8000-000000000001|30000`)
  await expect.poll(() => sql(`select count(*) from public.audit_events where action='receivable.appointment_charge_created' and correlation_id=${quote(appointmentId)}`)).toBe('1')

  await page.getByText('Ver detalhes').first().click()
  await page.getByRole('button', { name: 'Cobrar falta/cancelamento fora do prazo' }).click()
  await expect.poll(() => sql(`select count(*) from public.receivables where source_type='appointment' and source_id=${quote(appointmentId)}`)).toBe('1')
})

test('a no-show charge is unavailable when the policy snapshot disabled it', async ({ page }) => {
  const id = randomUUID()
  const disabledSnapshot = { ...snapshot, noShowChargeEnabled: false }
  sql(`insert into public.appointments
    (id,person_id,service_id,starts_at,ends_at,status,policy_version,cancellation_deadline_at,business_timezone,cancellation_policy_snapshot)
    values (${quote(id)},'d0000000-0000-4000-8000-000000000001','d0200000-0000-4000-8000-000000000001',
      '2020-01-08T15:00:00-03:00'::timestamptz,'2020-01-08T15:50:00-03:00'::timestamptz,
      'no_show',1,'2030-01-01T12:00:00Z'::timestamptz,'America/Sao_Paulo',${quote(JSON.stringify(disabledSnapshot))}::jsonb)`)

  await signInDemo(page)
  await page.goto('/agenda?view=day&date=2020-01-08', { waitUntil: 'domcontentloaded' })
  await page.getByText('Ver detalhes').first().click()
  await expect(page.getByRole('button', { name: 'Cobrar falta/cancelamento fora do prazo' })).toHaveCount(0)
  expect(sql(`select count(*) from public.receivables where source_type='appointment' and source_id=${quote(id)}`)).toBe('0')
})
