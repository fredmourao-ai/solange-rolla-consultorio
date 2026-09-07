import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string) { return readFileSync(join(process.cwd(), path), 'utf8') }

describe('homologation operational guardrails', () => {
  it('rejects zero-priced services before they can enter a chargeable appointment flow', () => {
    const actions = source('src/app/(protected)/agenda/gerenciar/actions.ts')
    const page = source('src/app/(protected)/agenda/gerenciar/page.tsx')
    expect(actions).toContain('parsePositiveMoneyToCents')
    expect(page).toContain('min="0.01"')
    expect(page).toContain('step="0.01"')
  })

  it('creates services and their sanitized audit event atomically', () => {
    const actions = source('src/app/(protected)/agenda/gerenciar/actions.ts')
    expect(actions).toContain("'create_service_with_audit'")
    expect(actions).not.toMatch(/createServiceAction[\s\S]*?from\('services'\)\.insert/)
  })

  it('creates fiscal-ready people and their sanitized audit event atomically', () => {
    const page = source('src/app/(protected)/pessoas/nova/page.tsx')
    expect(page).toContain("'create_person_with_audit'")
    const migration = source('supabase/migrations/20260907012000_people_creation_audit.sql')
    expect(migration).toContain("jsonb_build_object('fiscalReady'")
    expect(migration).toContain("jsonb_build_object('fiscalReady', coalesce(p_fiscal_address, '{}'::jsonb) <> '{}'::jsonb)")
    expect(migration).not.toContain("'cpf'")
    expect(migration).not.toContain("'street'")
    expect(migration).not.toContain("'postalCode'")
  })
})
