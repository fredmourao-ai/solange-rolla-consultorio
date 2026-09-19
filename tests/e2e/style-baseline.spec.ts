import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

test('home exposes the Solange Rolla brand with accessible focus', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('img', { name: 'Solange Rolla' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Consultório Solange Rolla' })).toBeVisible()
  const primaryLink = page.getByRole('link', { name: 'Acessar sistema' })
  await expect(primaryLink).toHaveClass(/ui-button--primary/)
  await expect(primaryLink).toHaveCSS('background-color', 'rgb(130, 66, 110)')
  await expect(primaryLink).toHaveCSS('text-decoration-line', 'none')
  await primaryLink.focus()
  await expect(primaryLink).toBeFocused()

  const accessibilityScan = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(accessibilityScan.violations).toEqual([])
})

test('home has no horizontal overflow on a 390px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const width = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(width.content).toBeLessThanOrEqual(width.viewport)
})
