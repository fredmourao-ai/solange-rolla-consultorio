import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { signInDemo } from './demo-auth'
import { runSql } from './db-command'

const dbUrl = process.env.DB_URL ?? ''
if (!dbUrl && process.env.E2E_DB_MODE !== 'supabase-management-api') throw new Error('DB_URL is required')
function sql(statement: string) { return runSql(statement, dbUrl) }
function q(value: string) { return `'${value.replaceAll("'", "''")}'` }

const legacySnapshot = { policyVersion: 1, countableHours: 48, excludedWeekdays: [6, 0] }
const createdAppointmentIds = new Set<string>()
const createdTaskIds = new Set<string>()

const currentSnapshot = {
  ...legacySnapshot,
  businessTimezone: 'America/Sao_Paulo',
  lateCancellationChargeEnabled: true,
  noShowChargeEnabled: true,
}

function insertAppointment(snapshot: object, startsAtLocal: string, status = 'confirmed') {
  const id = randomUUID()
  createdAppointmentIds.add(id)
  sql(`insert into public.appointments
    (id,person_id,service_id,starts_at,ends_at,status,policy_version,cancellation_deadline_at,business_timezone,cancellation_policy_snapshot)
    values (${q(id)},'d0000000-0000-4000-8000-000000000001','d0200000-0000-4000-8000-000000000001',
      (${q(startsAtLocal)}::timestamp at time zone 'America/Sao_Paulo'),
      ((${q(startsAtLocal)}::timestamp at time zone 'America/Sao_Paulo') + interval '50 minutes'),
      ${q(status)},1,((${q(startsAtLocal)}::timestamp at time zone 'America/Sao_Paulo') - interval '4 days'),
      'America/Sao_Paulo',${q(JSON.stringify(snapshot))}::jsonb)`)
  return id
}

test.afterEach(() => {
  for (const taskId of createdTaskIds) {
    sql(`delete from public.tasks where id=${q(taskId)}`)
  }
  createdTaskIds.clear()

  for (const appointmentId of createdAppointmentIds) {
    sql(`delete from public.receivables where source_type='appointment' and source_id=${q(appointmentId)}`)
    sql(`delete from public.appointments where id=${q(appointmentId)}`)
  }
  createdAppointmentIds.clear()
})

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

async function openAgendaItem(page: Page, appointmentId: string) {
  const item = page.locator(`li.appointment-calendar__item[data-appointment-id="${appointmentId}"]`)
  await expect(item).toBeVisible()
  const details = item.locator('details')
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.getByText('Abrir consulta').click()
  }
  return item
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

test('legacy late-cancellation remains chargeable through the agenda UI', async ({ page }) => {
  const appointmentId = insertAppointment(legacySnapshot, '2034-04-05T10:00', 'cancelled_late')
  await signInDemo(page)
  await page.goto('/agenda?view=day&date=2034-04-05', { waitUntil: 'domcontentloaded' })
  const item = await openAgendaItem(page, appointmentId)
  const charge = item.getByRole('button', { name: 'Registrar cobrança' })
  await expect(charge).toBeVisible()
  await charge.click()
  await expect.poll(() => sql(`select count(*) from public.receivables where idempotency_key=${q(`appointment:${appointmentId}:charge`)}`)).toBe('1')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await openAgendaItem(page, appointmentId)
  await expect.poll(() => sql(`select count(*) from public.receivables where source_type='appointment' and source_id=${q(appointmentId)}`)).toBe('1')
})

test('staff claims and completes an unassigned partial task through the UI with reload verification', async ({ page }) => {
  const taskId = randomUUID()
  const title = `Tarefa parcial UI ${taskId.slice(0, 8)}`
  createdTaskIds.add(taskId)
  const ownerId = sql("select user_id from public.profiles where role='psychologist_owner' and active=true order by created_at limit 1")
  if (!ownerId) throw new Error('E2E_ACTIVE_OWNER_REQUIRED')
  sql(`insert into public.tasks (id,type,title,status,created_by_user_id,assigned_to_user_id,person_id,appointment_id,due_at)
    values (${q(taskId)},'other_admin',${q(title)},'open',${q(ownerId)},null,null,null,null)`)

  await signInDemo(page)
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  let item = page.locator('li.task-queue-item').filter({ hasText: title })
  await expect(item).toBeVisible()
  await expect(item.locator('.task-queue-item__bucket')).toHaveText('Sem responsável')
  await item.getByRole('button', { name: 'Assumir' }).click()
  await expect.poll(() => sql(`select assigned_to_user_id from public.tasks where id=${q(taskId)}`)).toBe(ownerId)

  await page.reload({ waitUntil: 'domcontentloaded' })
  item = page.locator('li.task-queue-item').filter({ hasText: title })
  await expect(item).toBeVisible()
  await expect(item.getByText(/Responsável:/)).toBeVisible()
  await item.getByRole('button', { name: 'Concluir' }).click()
  await expect.poll(() => sql(`select status from public.tasks where id=${q(taskId)}`)).toBe('done')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('li.task-queue-item').filter({ hasText: title })).toHaveCount(0)
})
