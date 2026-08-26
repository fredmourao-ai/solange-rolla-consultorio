import { expect, test } from '@playwright/test'

test('dashboard shell exposes operational navigation', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pessoas' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Clínico' })).toHaveCount(0)
})

test('mobile navigation opens and closes with keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  const openButton = page.getByRole('button', { name: 'Abrir menu' })
  await expect(openButton).not.toBeFocused()
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2'
  })
  await expect(openButton).toBeVisible()
  await openButton.focus()
  await page.keyboard.press('Enter')
  const mobileNavigation = page.locator('#mobile-navigation')
  await expect(mobileNavigation.getByRole('link', { name: 'Relatórios' })).toBeVisible()
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  await expect(mobileNavigation).toHaveCount(0)
  await expect(openButton).toBeFocused()
})
