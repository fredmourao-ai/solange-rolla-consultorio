import { expect, test } from '@playwright/test'

test('anonymous access cannot reveal the clinical workspace', async ({ page }) => {
  const response = await page.goto('/clinico/person-1', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(404)
  await expect(page.getByText(/SENSITIVE_SENTINEL_DO_NOT_LOG|ciphertext|auth_tag|Registro psicológico protegido/i)).toHaveCount(0)
})
