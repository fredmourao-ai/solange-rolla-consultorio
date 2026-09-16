import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('patient administrative update audit', () => {
  it('records sanitized change categories without copying emergency-contact PII', () => {
    const dir = path.join(process.cwd(), 'supabase/migrations')
    const sql = readdirSync(dir).filter((name) => name.endsWith('.sql'))
      .map((name) => readFileSync(path.join(dir, name), 'utf8')).join('\n')
    const section = sql.split("'person.updated'")[1] ?? ''
    expect(section).toContain('emergencyContactChanged')
    expect(section).toContain('fiscalChanged')
    expect(section).not.toContain("new.emergency_contact_name")
    expect(section).not.toContain("new.emergency_contact_phone_e164")
  })
})
