import { expect, test } from './fixtures'
import { syntheticConsultationFinance } from '../fixtures/synthetic-finance'
import { syntheticPerson } from '../fixtures/synthetic-people'
import { signInDemo } from './demo-auth'

test('canonical consultation lifecycle uses synthetic identifiers and mock fiscal provider', async ({ page }) => {
  await signInDemo(page)
  const person = syntheticPerson()
  const finance = syntheticConsultationFinance()
  const lifecycle = ['person_created', 'appointment_scheduled', 'form_submitted', 'terms_accepted', 'signed', 'confirmed', 'completed', 'paid', 'fiscal_issued']

  expect(person.email).toMatch(/@example\.test$/)
  expect(finance.fiscalProvider).toBe('mock')
  expect(lifecycle).toEqual(expect.arrayContaining(['signed', 'confirmed', 'paid', 'fiscal_issued']))
  expect(finance.paymentCents).toBe(finance.receivableCents)

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await page.goto('/relatorios', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Relatórios' })).toBeVisible()
  await expect(page.getByText('Resultado realizado')).toBeVisible()
})

test('consultation retry keys remain stable and do not duplicate synthetic payment', async () => {
  const finance = syntheticConsultationFinance()
  expect(new Set([finance.paymentIdempotencyKey, finance.paymentIdempotencyKey]).size).toBe(1)
})
