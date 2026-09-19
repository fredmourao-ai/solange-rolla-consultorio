import { expect, test } from './fixtures'
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

test('dashboard metrics lead directly to the related operational areas', async ({ page }) => {
  await signInDemo(page)
  for (const [name, href] of [['Abrir agenda', '/agenda'], ['Abrir financeiro', '/financeiro'], ['Abrir eventos', '/eventos'], ['Abrir pacientes', '/pessoas']] as const) {
    await expect(page.getByRole('link', { name })).toHaveAttribute('href', href)
  }
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

test('mobile key routes start with content visible and never overflow horizontally', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInDemo(page)

  const routes = ['/dashboard', '/pessoas', '/agenda', '/agenda/gerenciar', '/financeiro', '/financeiro/operacoes', '/eventos', '/eventos/operacoes', '/formularios', '/fiscal', '/fiscal/operacoes', '/relatorios', '/usuarios']
  for (const path of routes) {
    await page.goto(path)
    await expect(page.locator('.app-shell__sidebar')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeVisible()
    const metrics = await page.evaluate(() => ({
      h1Top: document.querySelector('h1')?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(metrics.h1Top, `${path} should start within the first mobile viewport`).toBeLessThan(220)
    expect(metrics.scrollWidth, `${path} should not overflow horizontally`).toBeLessThanOrEqual(metrics.clientWidth)
  }
})

test('operational forms provide branded controls and touch-sized targets on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInDemo(page)

  for (const path of ['/agenda/gerenciar', '/financeiro/operacoes', '/eventos/operacoes', '/formularios', '/fiscal/operacoes']) {
    await page.goto(path)
    const visibleControls = page.locator('.app-shell__main :is(input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea, button):visible')
    expect(await visibleControls.count(), `${path} should expose operational controls`).toBeGreaterThan(0)
    const undersized = await visibleControls.evaluateAll((elements) => elements.filter((element) => {
      const rect = element.getBoundingClientRect()
      return rect.height < 44
    }).length)
    expect(undersized, `${path} should not expose controls shorter than 44px`).toBe(0)

    const firstInput = page.locator('.app-shell__main input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])').first()
    if (await firstInput.count()) {
      expect(Number.parseFloat(await firstInput.evaluate((element) => getComputedStyle(element).borderRadius))).toBeGreaterThan(0)
    }
  }
})


test('mobile secondary navigation and return links expose touch-sized targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInDemo(page)

  for (const path of ['/agenda/gerenciar', '/financeiro/operacoes', '/eventos/operacoes', '/fiscal/operacoes', '/relatorios']) {
    await page.goto(path)
    const links = page.locator('.app-shell__main > nav a:visible, .app-shell__main > p > a:visible')
    expect(await links.count(), `${path} should expose secondary navigation links`).toBeGreaterThan(0)
    const undersized = await links.evaluateAll((elements) => elements.filter((element) => element.getBoundingClientRect().height < 44).length)
    expect(undersized, `${path} should not expose secondary navigation links shorter than 44px`).toBe(0)
  }
})
