import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { expect, test } from './fixtures'
import { signInDemo } from './demo-auth'

const dbUrl = process.env.DB_URL ?? ''
if (!dbUrl) throw new Error('local Supabase DB_URL is required')
function sql(statement: string): string { return execFileSync('psql', [dbUrl, '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement], { encoding: 'utf8' }).trim() }
function q(value: string): string { return `'${value.replaceAll("'", "''")}'` }

function unassignedTask(title: string) {
  const id = randomUUID()
  const ownerId = sql(`select id from auth.users where email='demo.owner@solange.invalid'`)
  sql(`insert into public.tasks (id, type, title, created_by_user_id, assigned_to_user_id) values (${q(id)}, 'other_admin', ${q(title)}, ${q(ownerId)}, null)`)
  return { id, ownerId }
}

test('owner sees an unassigned task in the dashboard queue and claims it', async ({ page }) => {
  const title = `Fila de teste ${randomUUID().slice(0, 8)}`
  const { id } = unassignedTask(title)

  await signInDemo(page)
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(title)).toBeVisible()
  await expect(page.getByText('Sem responsável').first()).toBeVisible()

  const item = page.locator('li.task-queue-item').filter({ has: page.locator(`input[name="task_id"][value="${id}"]`) })
  await item.getByRole('button', { name: 'Assumir' }).click()

  await expect.poll(() => sql(`select assigned_to_user_id from public.tasks where id=${q(id)}`)).not.toBe('')
})

test('owner completes an assigned task from the dashboard queue', async ({ page }) => {
  const title = `Fila de teste ${randomUUID().slice(0, 8)}`
  const { id, ownerId } = unassignedTask(title)
  sql(`update public.tasks set assigned_to_user_id=${q(ownerId)} where id=${q(id)}`)

  await signInDemo(page)
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  const item = page.locator('li.task-queue-item').filter({ has: page.locator(`input[name="task_id"][value="${id}"]`) })
  await item.getByRole('button', { name: 'Concluir' }).click()

  await expect.poll(() => sql(`select status from public.tasks where id=${q(id)}`)).toBe('done')
})
