import { expect, test } from '@playwright/test'

test('fiscal operations page exposes sanitized document states', async ({ page }) => {
  await page.goto('/fiscal', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Fiscal' })).toBeVisible()
  await expect(page.getByText('Pronto para revisão')).toBeVisible()
  await expect(page.getByText('Tratamento fiscal pendente')).toBeVisible()
  await expect(page.getByText('Documento emitido')).toBeVisible()
  await expect(page.getByText(/CPF|CNPJ|XML completo/i)).toHaveCount(0)
})
