import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('patient administrative update audit', () => {
  it('records sanitized change categories without copying emergency-contact PII', () => {
    const dir = path.join(process.cwd(), 'supabase/migrations')
    const migrations = readdirSync(dir).filter((name) => name.endsWith('.sql'))
      .map((name) => readFileSync(path.join(dir, name), 'utf8'))
    const sql = migrations.join('\n')
    const updateMigration = migrations.find((source) => source.includes("'person.updated'")) ?? ''
    const section = sql.split("'person.updated'")[1] ?? ''
    expect(section).toContain('emergencyContactChanged')
    expect(section).toContain('fiscalChanged')
    expect(updateMigration).toContain('coalesce(old.preferred_name <> new.preferred_name, false)')
    expect(updateMigration).toContain('coalesce(old.email_normalized <> new.email_normalized, false)')
    expect(updateMigration).toContain('coalesce(old.emergency_contact_name <> new.emergency_contact_name, false)')
    expect(updateMigration).toContain('coalesce(old.fiscal_address <> new.fiscal_address, false)')
    expect(section).not.toContain('new.emergency_contact_name')
    expect(section).not.toContain('new.emergency_contact_phone_e164')
  })
})
