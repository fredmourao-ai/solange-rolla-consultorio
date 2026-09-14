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

test('navigation is patient-centric and highlights the current administrative route', async ({ page }) => {
  await signInDemo(page)

  const patientLink = page.locator('.sidebar-nav').getByRole('link', { name: 'Pacientes', exact: true })
  await expect(patientLink).toHaveAttribute('href', '/pessoas')
  await expect(page.locator('.sidebar-nav').getByRole('link', { name: 'Pessoas', exact: true })).toHaveCount(0)

  for (const [path, label] of [['/agenda', 'Agenda'], ['/financeiro', 'Financeiro'], ['/fiscal', 'Fiscal']] as const) {
    await page.goto(path)
    const active = page.locator('.sidebar-nav a[aria-current="page"]')
    await expect(active).toHaveCount(1)
    await expect(active).toHaveText(label)
    await expect(page.getByRole('link', { name: 'Início', exact: true }).first()).not.toHaveAttribute('aria-current', 'page')
  }
})

test('desktop sidebar keeps every routine reachable on a short viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await signInDemo(page)

  const sidebar = page.locator('.app-shell__sidebar')
  const scrollRegion = page.getByTestId('sidebar-scroll-region')
  await expect(sidebar).toBeVisible()
  await expect(sidebar).toHaveCSS('height', '768px')
  await expect(scrollRegion).toHaveCSS('overflow-y', 'auto')

  const metrics = await scrollRegion.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }))
  expect(metrics.scrollHeight).toBeGreaterThanOrEqual(metrics.clientHeight)

  await expect(page.locator('.sidebar-nav').getByRole('link', { name: 'Relatórios', exact: true })).toBeVisible()
})
