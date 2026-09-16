import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = path.join(process.cwd(), '.github/workflows/historical-state-audit.yml')

describe('historical state audit workflow', () => {
  it('explicitly selects the allowlisted historical external suite', () => {
    const source = readFileSync(workflow, 'utf8')
    expect(source).toContain("'E2E_EXTERNAL_SUITE': 'historical-state'")
    expect(source).toContain('tests/e2e/agenda-historical-state-transitions.spec.ts')
  })
})
