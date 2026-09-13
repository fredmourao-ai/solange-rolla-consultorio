import { expect, test } from '@playwright/test'

const email = process.env.DEMO_LOCAL_EMAIL
const password = process.env.DEMO_LOCAL_PASSWORD

async function signIn(page: import('@playwright/test').Page) {
  if (!email || !password) throw new Error('local demo credentials are required')
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test('dashboard shell exposes real operational navigation', async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  const expected = {
    'Início': '/dashboard', Pacientes: '/pessoas', Agenda: '/agenda', Eventos: '/eventos',
    Financeiro: '/financeiro', Fiscal: '/fiscal', Relatórios: '/relatorios',
  }
  for (const [name, href] of Object.entries(expected)) {
    await expect(page.getByRole('link', { name }).first()).toHaveAttribute('href', href)
  }
  await expect(page.getByRole('link', { name: 'Clínico' })).toHaveCount(0)
})

test('mobile navigation opens and closes with keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  const openButton = page.getByRole('button', { name: 'Abrir menu' })
  await expect(openButton).not.toBeFocused()
  await page.evaluate(() => { document.documentElement.style.zoom = '2' })
  await expect(openButton).toBeVisible()
  await openButton.focus()
  await page.keyboard.press('Enter')
  const mobileNavigation = page.locator('#mobile-navigation')
  await expect(mobileNavigation.getByRole('link', { name: 'Relatórios' })).toHaveAttribute('href', '/relatorios')
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  await expect(mobileNavigation).toHaveCount(0)
  await expect(openButton).toBeFocused()
})
