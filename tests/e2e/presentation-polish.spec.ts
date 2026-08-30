import { expect, test } from '@playwright/test'
import { signInDemo } from './demo-auth'

test('key demo surfaces use product-grade card and list layouts', async ({ page }) => {
  await signInDemo(page)

  const dashboard = page.locator('.dashboard-grid')
  await expect(dashboard).toHaveCSS('display', 'grid')
  expect(await dashboard.evaluate((el) => getComputedStyle(el).gridTemplateColumns)).not.toBe('none')

  await page.goto('/agenda?view=month&date=2026-08-29')
  await expect(page.locator('.appointment-calendar')).toHaveCSS('display', 'grid')
  await expect(page.locator('.appointment-calendar__item').first()).not.toHaveCSS('border-top-width', '0px')

  await page.goto('/financeiro')
  await expect(page.locator('.receivables-list')).toHaveCSS('list-style-type', 'none')
  await expect(page.locator('.receivables-list > li').first()).toHaveCSS('display', 'grid')

  await page.goto('/pessoas')
  await expect(page.locator('.people-results')).toHaveCSS('list-style-type', 'none')
  await expect(page.locator('.people-results__item').first()).not.toHaveCSS('border-top-width', '0px')
})
