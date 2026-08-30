import { expect, type Page } from '@playwright/test'

const email = process.env.DEMO_LOCAL_EMAIL
const password = process.env.DEMO_LOCAL_PASSWORD

export async function signInDemo(page: Page) {
  if (!email || !password) throw new Error('local demo credentials are required')
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}
