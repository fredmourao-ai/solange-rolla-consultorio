import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'
import { signInDemo } from './demo-auth'

for (const path of ['/dashboard', '/relatorios', '/eventos']) {
  test(`administrative route ${path} has no serious accessibility violations`, async ({ page }) => {
    await signInDemo(page)
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    const scan = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(scan.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? '')).map((violation) => violation.id)).toEqual([])
  })
}
