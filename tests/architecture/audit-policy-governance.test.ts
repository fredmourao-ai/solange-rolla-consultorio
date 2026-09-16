import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function projectFile(path: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), 'utf8')
}

describe('audit policy governance', () => {
  it('requires historical data classes and persisted state-transition verification', () => {
    const protocol = projectFile('docs/quality/EXTREME_AUDIT_PROTOCOL.md')

    expect(protocol).toContain('classe de dado histórico')
    expect(protocol).toContain('no-op update')
    expect(protocol).toContain('reload/reopen')
    expect(protocol).toContain('dados novos, legados, migrados')
  })

  it('makes the canonical audit policy mandatory for agents and completion', () => {
    const agents = projectFile('AGENTS.override.md')
    const policy = projectFile('AUDIT_POLICY.md')
    const done = projectFile('docs/DEFINITION_OF_DONE.md')

    expect(agents).toContain('AUDIT_POLICY.md')
    expect(policy).toContain('matriz de transições de estado e dados históricos')
    expect(done).toContain('registro pré-existente')
    expect(done).toContain('recarregar/reabrir')
  })
})
