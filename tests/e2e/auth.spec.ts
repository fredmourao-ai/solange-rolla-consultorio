import { expect, test } from './fixtures'

test('login page exposes the internal staff access form', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Entrar no consultório' })).toBeVisible()
  await expect(page.getByLabel('Usuário ou e-mail')).toHaveAttribute('autocomplete', 'username')
  await expect(page.getByLabel('Senha')).toHaveAttribute('autocomplete', 'current-password')
})

test('removed temporary admin alias is rejected', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Usuário ou e-mail').fill('admin')
  await page.getByLabel('Senha').fill('admin')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível entrar' })).toContainText('Não foi possível entrar')
})

test.describe('unauthenticated access to protected routes', () => {
  const protectedRoutes = ['/dashboard', '/agenda', '/pessoas', '/eventos', '/financeiro', '/fiscal', '/relatorios']

  for (const route of protectedRoutes) {
    test(`${route} redirects to login without a session`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/login$/)
      await expect(page.getByRole('heading', { name: 'Entrar no consultório' })).toBeVisible()
    })
  }
})
