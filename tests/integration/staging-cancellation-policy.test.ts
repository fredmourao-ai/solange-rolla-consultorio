import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('staging cancellation policy baseline', () => {
  it('provisions a cancellation policy through forward migrations without relying on seed.sql', () => {
    const dir = join(process.cwd(), 'supabase', 'migrations')
    const migrationText = readdirSync(dir)
      .filter((name) => name.endsWith('.sql'))
      .map((name) => readFileSync(join(dir, name), 'utf8'))
      .join('\n')

    expect(migrationText).toContain('insert into public.legal_documents')
    expect(migrationText).toContain("'cancellation_policy'")
    expect(migrationText).toContain('insert into public.cancellation_policies')
    expect(migrationText).toContain("'America/Sao_Paulo'")
    expect(migrationText).toContain('48')
  })
})
