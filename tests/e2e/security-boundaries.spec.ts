import { expect, test } from '@playwright/test'

test('anonymous requests cannot reach clinical content or reveal its existence', async ({ page }) => {
  const response = await page.goto('/clinico/synthetic-person-1', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(404)
  await expect(page.getByText(/clinical|ciphertext|auth_tag|sensitive/i)).toHaveCount(0)
})

test('malformed capability paths fail closed without patient enumeration', async ({ page }) => {
  const response = await page.goto('/formularios/not-a-capability-token', { waitUntil: 'domcontentloaded' })
  expect([404, 307, 308]).toContain(response?.status())
  await expect(page.getByText(/CPF|diagnóstico|respostas clínicas|ciphertext/i)).toHaveCount(0)
})

test('default administrative shell does not expose the clinical navigation item', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('link', { name: 'Clínico' })).toHaveCount(0)
})
