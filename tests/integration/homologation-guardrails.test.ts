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
    const page = source('src/app/(protected)/pessoas/nova/page.tsx')
    expect(page).toContain("action: 'person.created'")
    expect(page).toContain("entityType: 'person'")
    expect(page).toContain('fiscalReady')
    expect(page).not.toMatch(/metadata:\s*\{[^}]*cpf/i)
    expect(page).not.toMatch(/metadata:\s*\{[^}]*address/i)
  })
})
