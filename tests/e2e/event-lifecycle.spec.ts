import { expect, test } from '@playwright/test'
import { uniqueJobKeys } from '../fixtures/synthetic-finance'
import { syntheticPerson } from '../fixtures/synthetic-people'
import { signInDemo } from './demo-auth'

test('canonical event lifecycle exposes an operational event surface', async ({ page }) => {
  await signInDemo(page)
  const participant = syntheticPerson('synthetic-event-participant-1')
  const jobs = uniqueJobKeys(['event:synthetic-event-1:payment', 'event:synthetic-event-1:fiscal', 'event:synthetic-event-1:payment'])

  expect(participant.id).toContain('synthetic-')
  expect(jobs).toHaveLength(2)
  await page.goto('/eventos', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Eventos' })).toBeVisible()
})

test('event participant data remains synthetic', async () => {
  expect(syntheticPerson('synthetic-event-participant-2').email).toContain('example.test')
})
