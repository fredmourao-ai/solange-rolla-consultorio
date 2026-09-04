import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { signInDemo } from './demo-auth'

const dbUrl = process.env.DB_URL ?? ''
if (!dbUrl) throw new Error('local Supabase DB_URL is required')
function sql(statement: string): string { return execFileSync('psql', [dbUrl, '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement], { encoding: 'utf8' }).trim() }
function q(value: string): string { return `'${value.replaceAll("'", "''")}'` }

function receivable() {
  const id = randomUUID()
  sql(`insert into public.receivables (id,source_type,source_id,person_id,payer_person_id,original_amount_cents,idempotency_key) values (${q(id)},'test',${q(randomUUID())},'d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001',10000,${q(`test:${id}`)})`)
  return id
}

test('owner records partial payment and audited adjustment from UI', async ({ page }) => {
  const id = receivable()
  await signInDemo(page)
  await page.goto('/financeiro/operacoes', { waitUntil: 'domcontentloaded' })
  const card = page.locator('article').filter({ has: page.locator(`input[name="receivable_id"][value="${id}"]`) })
  const paymentForm = card.locator('form').filter({ has: page.getByRole('button', { name: 'Registrar pagamento' }) })
  await paymentForm.locator('input[name="amount"]').fill('40.00')
  await paymentForm.locator('select[name="method"]').selectOption('pix')
  await paymentForm.getByRole('button', { name: 'Registrar pagamento' }).click()
  await expect(page).toHaveURL(/\/financeiro\/operacoes$/)
  expect(sql(`select status from public.receivables where id=${q(id)}`)).toBe('partial')
  expect(sql(`select count(*) from public.audit_events where action='payment.recorded' and metadata->>'receivableId'=${q(id)}`)).toBe('1')

  const updatedCard = page.locator('article').filter({ has: page.locator(`input[name="receivable_id"][value="${id}"]`) })
  const adjustmentForm = updatedCard.locator('form').filter({ has: page.getByRole('button', { name: 'Aplicar ajuste' }) })
  await adjustmentForm.locator('input[name="amount"]').fill('10.00')
  await adjustmentForm.locator('select[name="direction"]').selectOption('discount')
  await adjustmentForm.locator('input[name="reason"]').fill('Cortesia de homologação')
  await adjustmentForm.getByRole('button', { name: 'Aplicar ajuste' }).click()
  expect(sql(`select adjustment_cents from public.receivable_adjustments where receivable_id=${q(id)} order by created_at desc limit 1`)).toBe('-1000')
})

test('account payable supports partial and full settlement with immutable payment history', async ({ page }) => {
  const vendorId = randomUUID(); const categoryId = randomUUID()
  sql(`insert into public.vendors (id,legal_name) values (${q(vendorId)},'Fornecedor Teste ${vendorId.slice(0,6)}')`)
  sql(`insert into public.expense_categories (id,name) values (${q(categoryId)},${q(`categoria-${categoryId}`)})`)
  await signInDemo(page)
  await page.goto('/financeiro/operacoes', { waitUntil: 'domcontentloaded' })
  const create = page.locator('form').filter({ has: page.getByRole('button', { name: 'Criar conta' }) })
  await create.locator('select[name="vendor_id"]').selectOption(vendorId)
  await create.locator('select[name="category_id"]').selectOption(categoryId)
  await create.locator('input[name="description"]').fill('Despesa de homologação')
  await create.locator('input[name="amount"]').fill('100.00')
  await create.locator('input[name="due_date"]').fill('2035-02-10')
  await create.locator('input[name="competence"]').fill('2035-02-01')
  await create.getByRole('button', { name: 'Criar conta' }).click()
  const payableId = sql(`select id from public.payables where vendor_id=${q(vendorId)} order by created_at desc limit 1`)

  let paymentForm = page.locator('form').filter({ has: page.locator(`input[name="payable_id"][value="${payableId}"]`) })
  await paymentForm.locator('input[name="amount"]').fill('30.00')
  await paymentForm.getByRole('button', { name: 'Registrar baixa' }).click()
  expect(sql(`select status||'|'||paid_cents from public.payables where id=${q(payableId)}`)).toBe('partial|3000')

  paymentForm = page.locator('form').filter({ has: page.locator(`input[name="payable_id"][value="${payableId}"]`) })
  await paymentForm.locator('input[name="amount"]').fill('70.00')
  await paymentForm.getByRole('button', { name: 'Registrar baixa' }).click()
  expect(sql(`select status||'|'||paid_cents from public.payables where id=${q(payableId)}`)).toBe('paid|10000')
  expect(sql(`select count(*) from public.payable_payments where payable_id=${q(payableId)}`)).toBe('2')
})
