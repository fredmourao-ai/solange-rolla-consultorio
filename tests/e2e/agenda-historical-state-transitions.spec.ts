import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { signInDemo } from './demo-auth'
import { runSql } from './db-command'

const dbUrl = process.env.DB_URL ?? ''
if (!dbUrl && process.env.E2E_DB_MODE !== 'supabase-management-api') throw new Error('DB_URL is required')
function sql(statement: string) { return runSql(statement, dbUrl) }
function q(value: string) { return `'${value.replaceAll("'", "''")}'` }

const legacySnapshot = { policyVersion: 1, countableHours: 48, excludedWeekdays: [6, 0] }
const currentSnapshot = {
  ...legacySnapshot,
  businessTimezone: 'America/Sao_Paulo',
  lateCancellationChargeEnabled: true,
  noShowChargeEnabled: true,
}

function insertAppointment(snapshot: object, startsAtLocal: string) {
  const id = randomUUID()
  sql(`insert into public.appointments
    (id,person_id,service_id,starts_at,ends_at,status,policy_version,cancellation_deadline_at,business_timezone,cancellation_policy_snapshot)
    values (${q(id)},'d0000000-0000-4000-8000-000000000001','d0200000-0000-4000-8000-000000000001',
      (${q(startsAtLocal)}::timestamp at time zone 'America/Sao_Paulo'),
      ((${q(startsAtLocal)}::timestamp at time zone 'America/Sao_Paulo') + interval '50 minutes'),
      'confirmed',1,((${q(startsAtLocal)}::timestamp at time zone 'America/Sao_Paulo') - interval '4 days'),
      'America/Sao_Paulo',${q(JSON.stringify(snapshot))}::jsonb)`)
  return id
}

function editor(page: Page, appointmentId: string) {
  return page.locator('article').filter({ has: page.locator(`input[name="appointment_id"][value="${appointmentId}"]`) }).locator('form')
}

async function expectPersistedEditor(page: Page, appointmentId: string, expectedLocal: string) {
  await page.reload({ waitUntil: 'domcontentloaded' })
  const form = editor(page, appointmentId)
  await expect(form).toBeVisible()
  await expect(form.locator('input[name="starts_at_local"]')).toHaveValue(expectedLocal)
  expect(sql(`select to_char(starts_at at time zone 'America/Sao_Paulo','YYYY-MM-DD"T"HH24:MI') from public.appointments where id=${q(appointmentId)}`)).toBe(expectedLocal)
}

test('staff edits a legacy cancellation-policy snapshot through the real UI and persists after reload', async ({ page }) => {
  const appointmentId = insertAppointment(legacySnapshot, '2034-02-05T10:00')
  await signInDemo(page)
  await page.goto('/agenda/gerenciar', { waitUntil: 'domcontentloaded' })
  const form = editor(page, appointmentId)
  await expect(form).toBeVisible()
  await form.locator('input[name="starts_at_local"]').fill('2034-02-06T11:00')
  await form.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page).toHaveURL(/\/agenda\/gerenciar$/)
  await expect(page.getByText('This page couldn’t load')).toHaveCount(0)
  await expect.poll(() => sql(`select count(*) from public.audit_events where action='appointment.updated' and entity_id=${q(appointmentId)}`)).toBe('1')
  await expectPersistedEditor(page, appointmentId, '2034-02-06T11:00')
})

test('staff can submit a no-op update for a current-format appointment and reopen it unchanged', async ({ page }) => {
  const appointmentId = insertAppointment(currentSnapshot, '2034-03-05T10:00')
  await signInDemo(page)
  await page.goto('/agenda/gerenciar', { waitUntil: 'domcontentloaded' })
  const form = editor(page, appointmentId)
  await expect(form).toBeVisible()
  await expect(form.locator('input[name="starts_at_local"]')).toHaveValue('2034-03-05T10:00')
  await form.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page).toHaveURL(/\/agenda\/gerenciar$/)
  await expect(page.getByText('This page couldn’t load')).toHaveCount(0)
  await expectPersistedEditor(page, appointmentId, '2034-03-05T10:00')
})
