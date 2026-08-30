import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('home exposes readable baseline and visible focus', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Solange Rolla' })).toBeVisible()
  const primaryLink = page.getByRole('link', { name: 'Abrir painel' })
  await expect(page.locator('.home-hero')).toHaveCSS('display', 'grid')
  await expect(page.locator('.home-feature-grid')).toHaveCSS('display', 'grid')
  await expect(primaryLink).toHaveClass(/ui-button--primary/)
  await primaryLink.focus()
  await expect(primaryLink).toBeFocused()

  const accessibilityScan = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(accessibilityScan.violations).toEqual([])
})
