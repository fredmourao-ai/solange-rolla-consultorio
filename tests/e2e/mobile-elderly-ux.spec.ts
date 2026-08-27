import { expect, test } from '@playwright/test'

test('dashboard remains operable on mobile at 200 percent zoom', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { document.documentElement.style.zoom = '2' })
  const menu = page.getByRole('button', { name: 'Abrir menu' })
  await expect(menu).toBeVisible()
  await menu.focus()
  await expect(menu).toBeFocused()
  const height = await menu.evaluate((element) => element.getBoundingClientRect().height)
  expect(height).toBeGreaterThanOrEqual(44)
  await page.keyboard.press('Enter')
  await expect(page.locator('#mobile-navigation')).toBeVisible()
})
