import { expect, test } from '@playwright/test'

test('login page exposes the internal staff access form', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Entrar no consultório' })).toBeVisible()
  await expect(page.getByLabel('Usuário ou e-mail')).toHaveAttribute('autocomplete', 'username')
  await expect(page.getByLabel('Senha')).toHaveAttribute('autocomplete', 'current-password')
})

test('temporary demo admin credentials reach the dashboard', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Usuário ou e-mail').fill('admin')
  await page.getByLabel('Senha').fill('admin')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
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
