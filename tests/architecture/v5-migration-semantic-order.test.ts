import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDirectory = path.join(process.cwd(), 'supabase/migrations')
const migrationNames = fs.readdirSync(migrationsDirectory)

function versionFor(suffix: string) {
  const filename = migrationNames.find((name) => name.endsWith(`_${suffix}.sql`))
  expect(filename, `missing migration for ${suffix}`).toBeDefined()
  return Number(filename!.slice(0, 14))
}

describe('V5 migration semantic ordering', () => {
  it('keeps the atomic audit migrations forward-only and applies legacy snapshot compatibility last', () => {
    const mainHistoryFloor = 20261001093000
    const atomicVersions = [
      versionFor('appointments_admin_atomic_audit'),
      versionFor('appointment_transition_atomic_audit'),
      versionFor('finance_remaining_atomic_audit'),
      versionFor('events_atomic_audit'),
      versionFor('forms_capability_atomic_audit'),
      versionFor('fiscal_atomic_audit'),
    ]

    expect(Math.min(...atomicVersions)).toBeGreaterThan(mainHistoryFloor)

    const compatibilityVersion = versionFor('appointments_legacy_snapshot_compat')
    expect(compatibilityVersion).toBeGreaterThan(Math.max(...atomicVersions))
  })
})
