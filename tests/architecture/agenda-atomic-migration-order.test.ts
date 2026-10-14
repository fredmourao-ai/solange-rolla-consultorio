import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const names = fs.readdirSync(path.join(process.cwd(), 'supabase/migrations'))
function versionFor(suffix: string) {
  const filename = names.find((name) => name.endsWith(`_${suffix}.sql`))
  expect(filename, `missing migration for ${suffix}`).toBeDefined()
  return Number(filename!.slice(0, 14))
}

describe('agenda atomic migration ordering', () => {
  it('is forward-only and leaves legacy snapshot compatibility as the final appointment helper definition', () => {
    const historyFloor = 20261001093000
    const createUpdate = versionFor('appointments_admin_atomic_audit')
    const transitions = versionFor('appointment_transition_atomic_audit')
    const legacyCompat = versionFor('appointments_legacy_snapshot_compat')
    expect(createUpdate).toBeGreaterThan(historyFloor)
    expect(transitions).toBeGreaterThan(createUpdate)
    expect(legacyCompat).toBeGreaterThan(transitions)
  })
})
