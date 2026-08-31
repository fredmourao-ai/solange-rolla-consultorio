import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'

const dbUrl = process.env.DB_URL ?? ''
if (!dbUrl) throw new Error('local Supabase DB_URL is required')

function sql(statement: string): string {
  return execFileSync('psql', [dbUrl, '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement], { encoding: 'utf8' }).trim()
}
function quote(value: string): string { return `'${value.replaceAll("'", "''")}'` }

function capabilityFor(appointmentId: string) {
  const capabilityId = randomUUID()
  const rawToken = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  sql(`insert into public.capabilities (id,token_hash,purpose,subject_type,subject_id,expires_at)
       values (${quote(capabilityId)},${quote(tokenHash)},'appointment_response','appointment',${quote(appointmentId)},clock_timestamp()+interval '30 minutes')`)
  return { capabilityId, rawToken }
}
function appointment(deadline: string) {
  const id = randomUUID()
  sql(`insert into public.appointments
    (id,person_id,service_id,starts_at,ends_at,status,policy_version,cancellation_deadline_at,business_timezone,cancellation_policy_snapshot)
    values (${quote(id)},'d0000000-0000-4000-8000-000000000001','d0200000-0000-4000-8000-000000000001',
      clock_timestamp()+interval '2 days',clock_timestamp()+interval '2 days 50 minutes','pending_confirmation',1,
      ${quote(deadline)}::timestamptz,'America/Sao_Paulo','{"policyVersion":1,"countableHours":48,"excludedWeekdays":[6,0]}'::jsonb)`)
  return id
}

test('patient exchanges an appointment_response capability and confirms', async ({ page }) => {
  const appointmentId = appointment('2030-01-01T12:00:00Z')
  const cap = capabilityFor(appointmentId)
  await page.goto(`/c/${cap.rawToken}?purpose=appointment_response`, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/consulta$/)
  await expect(page.getByRole('heading', { name: 'Confirme sua consulta' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar consulta' }).click()
  await expect(page).toHaveURL(/\/consulta\?ok=confirm$/)
  expect(sql(`select status from public.appointments where id=${quote(appointmentId)}`)).toBe('confirmed')
})
test('patient requests rescheduling without changing the appointment time', async ({ page }) => {
  const appointmentId = appointment('2030-01-01T12:00:00Z')
  const before = sql(`select starts_at from public.appointments where id=${quote(appointmentId)}`)
  const cap = capabilityFor(appointmentId)
  await page.goto(`/c/${cap.rawToken}?purpose=appointment_response`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Solicitar reagendamento' }).click()
  await expect(page).toHaveURL(/\/consulta\?ok=reschedule$/)
  expect(sql(`select status from public.appointments where id=${quote(appointmentId)}`)).toBe('reschedule_requested')
  expect(sql(`select starts_at from public.appointments where id=${quote(appointmentId)}`)).toBe(before)
  expect(sql(`select response from public.appointment_confirmations where appointment_id=${quote(appointmentId)} order by responded_at desc nulls last limit 1`)).toBe('request_reschedule')
})

test('patient cancels within policy without charge acknowledgement', async ({ page }) => {
  const appointmentId = appointment('2030-01-01T12:00:00Z')
  const cap = capabilityFor(appointmentId)
  await page.goto(`/c/${cap.rawToken}?purpose=appointment_response`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/cancelar sem cobrança até/i)).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar consulta' }).click()
  await expect(page).toHaveURL(/\/consulta\?ok=cancel$/)
  expect(sql(`select status from public.appointments where id=${quote(appointmentId)}`)).toBe('cancelled_in_time')
})
test('late cancellation requires explicit charge acknowledgement', async ({ page }) => {
  const appointmentId = appointment('2026-08-28T12:00:00Z')
  const cap = capabilityFor(appointmentId)
  await page.goto(`/c/${cap.rawToken}?purpose=appointment_response`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/prazo de cancelamento sem cobrança terminou/i)).toBeVisible()
  const acknowledgement = page.getByRole('checkbox')
  await expect(acknowledgement).toBeVisible()
  await acknowledgement.check()
  await page.getByRole('button', { name: 'Cancelar consulta' }).click()
  await expect(page).toHaveURL(/\/consulta\?ok=cancel$/)
  expect(sql(`select status from public.appointments where id=${quote(appointmentId)}`)).toBe('cancelled_late')
  expect(sql(`select response from public.appointment_confirmations where appointment_id=${quote(appointmentId)} order by responded_at desc nulls last limit 1`)).toBe('cancelled')
})
