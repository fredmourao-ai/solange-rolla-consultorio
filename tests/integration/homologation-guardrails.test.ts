import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string) { return readFileSync(join(process.cwd(), path), 'utf8') }

describe('homologation operational guardrails', () => {
  it('rejects zero-priced services before they can enter a chargeable appointment flow', () => {
    const actions = source('src/app/(protected)/agenda/gerenciar/actions.ts')
    const page = source('src/app/(protected)/agenda/gerenciar/page.tsx')
    expect(actions).toMatch(/priceCents\s*<=\s*0/)
    expect(page).toContain('min="0.01"')
    expect(page).toContain('step="0.01"')
  })

  it('records a sanitized person.created audit event after UI person creation', () => {
    const migration = source('supabase/migrations/20260907020000_people_audited_creation.sql')
    expect(migration).toContain("'person.created'")
    expect(migration).toContain("'person'")
    expect(migration).toContain("'fiscalReady'")
    expect(migration).not.toContain("jsonb_build_object('cpf'")
    expect(migration).not.toContain("jsonb_build_object('address'")
  })
})
