import { expect, test } from './fixtures'
import { signInDemo } from './demo-auth'

test('fiscal operations page exposes sanitized document states', async ({ page }) => {
  await signInDemo(page)
  await page.goto('/fiscal', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Fiscal' })).toBeVisible()
  await expect(page.getByLabel('Status: Pronto para revisão')).toBeVisible()
  await expect(page.getByText('Documento emitido')).toBeVisible()
  await expect(page.getByText(/CPF|CNPJ|XML completo/i)).toHaveCount(0)
})
