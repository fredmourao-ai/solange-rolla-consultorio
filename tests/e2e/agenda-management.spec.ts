import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { signInDemo } from './demo-auth'

const dbUrl = process.env.DB_URL ?? ''
if (!dbUrl) throw new Error('local Supabase DB_URL is required')
function sql(statement: string): string { return execFileSync('psql', [dbUrl, '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement], { encoding: 'utf8' }).trim() }
function quote(value: string): string { return `'${value.replaceAll("'", "''")}'` }

function createPerson(name: string) {
  const id = randomUUID()
  sql(`insert into public.people (id,civil_name,birth_date,preferred_channel,birthday_messages_enabled) values (${quote(id)},${quote(name)},'1990-01-01','none',false)`)
  return id
}

test('staff creates an appointment from the protected agenda management UI', async ({ page }) => {
  const name = `Paciente Agenda ${randomUUID().slice(0, 8)}`
  const personId = createPerson(name)
  await signInDemo(page)
  await page.goto('/agenda/gerenciar', { waitUntil: 'domcontentloaded' })
  const form = page.locator('form').first()
  await form.locator('select[name="person_id"]').selectOption(personId)
  await form.locator('select[name="service_id"]').selectOption('d0200000-0000-4000-8000-000000000001')
  await form.locator('input[name="starts_at_local"]').fill('2035-01-15T14:00')
  await form.getByRole('button', { name: 'Criar consulta' }).click()
  await expect(page).toHaveURL(/\/agenda\/gerenciar$/)
  await expect.poll(() => sql(`select count(*) from public.appointments where person_id=${quote(personId)} and starts_at='2035-01-15T17:00:00Z'::timestamptz`)).toBe('1')
  await expect.poll(() => sql(`select count(*) from public.audit_events where action='appointment.created' and metadata->>'personId'=${quote(personId)}`)).toBe('1')
})

test('staff resolves a reschedule request while preserving the policy snapshot', async ({ page }) => {
  const name = `Paciente Reagenda ${randomUUID().slice(0, 8)}`
  const personId = createPerson(name)
  const appointmentId = randomUUID()
  const snapshot = { policyVersion: 1, countableHours: 48, excludedWeekdays: [0, 6], businessTimezone: 'America/Sao_Paulo', lateCancellationChargeEnabled: true, noShowChargeEnabled: true }
  sql(`insert into public.appointments (id,person_id,service_id,starts_at,ends_at,status,policy_version,cancellation_deadline_at,business_timezone,cancellation_policy_snapshot) values (${quote(appointmentId)},${quote(personId)},'d0200000-0000-4000-8000-000000000001','2035-01-16T17:00:00Z','2035-01-16T17:50:00Z','reschedule_requested',1,'2035-01-14T17:00:00Z','America/Sao_Paulo',${quote(JSON.stringify(snapshot))}::jsonb)`)
  await signInDemo(page)
  await page.goto('/agenda/gerenciar', { waitUntil: 'domcontentloaded' })
  const article = page.locator('article').filter({ has: page.getByRole('heading', { name: new RegExp(name) }) })
  const form = article.locator('form')
  await form.locator('input[name="starts_at_local"]').fill('2035-01-20T15:00')
  await form.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page).toHaveURL(/\/agenda\/gerenciar$/)
  await expect.poll(() => sql(`select status||'|'||starts_at::text||'|'||policy_version::text from public.appointments where id=${quote(appointmentId)}`)).toContain('rescheduled|2035-01-20 18:00:00+00|1')
  await expect.poll(() => sql(`select count(*) from public.appointment_status_history where appointment_id=${quote(appointmentId)} and from_status='reschedule_requested' and to_status='rescheduled'`)).toBe('1')
})
