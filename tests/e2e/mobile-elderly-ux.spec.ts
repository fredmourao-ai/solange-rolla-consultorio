import { expect, test } from './fixtures'
import { signInDemo } from './demo-auth'

test('dashboard remains operable on mobile at 200 percent zoom', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInDemo(page)
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

test('protected shell carries the brand without horizontal mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInDemo(page)
  await expect(page.locator('.mobile-nav__brand')).toBeVisible()
  const width = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(width.content).toBeLessThanOrEqual(width.viewport)
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(page.locator('#mobile-navigation')).toBeVisible()
})
