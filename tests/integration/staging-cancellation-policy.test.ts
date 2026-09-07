import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('staging cancellation policy baseline', () => {
  it('keeps policy bootstrap outside production migrations and in the staging deployment', () => {
    const dir = join(process.cwd(), 'supabase', 'migrations')
    const migrationText = readdirSync(dir)
      .filter((name) => name.endsWith('.sql'))
      .map((name) => readFileSync(join(dir, name), 'utf8'))
      .join('\n')
    const bootstrap = readFileSync(join(process.cwd(), 'scripts', 'ensure-staging-cancellation-policy.mjs'), 'utf8')

    expect(migrationText).not.toContain('Modelo provisório de homologação')
    expect(bootstrap).toContain('insert into public.legal_documents')
    expect(bootstrap).toContain("'cancellation_policy'")
    expect(bootstrap).toContain('insert into public.cancellation_policies')
    expect(bootstrap).toContain("'America/Sao_Paulo'")
    expect(bootstrap).toContain('48')
    expect(bootstrap).toContain('is_draft')
    expect(bootstrap).toContain('true')
  })
})
