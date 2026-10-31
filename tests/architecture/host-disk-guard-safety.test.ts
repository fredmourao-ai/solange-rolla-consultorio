import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(new URL('../../scripts/host-disk-guard.sh', import.meta.url))
const diskGuard = readFileSync(scriptPath, 'utf8')

describe('host disk guard safety', () => {
  it('does not delete Docker volumes without explicit ownership provenance', () => {
    expect(diskGuard).not.toMatch(/docker\s+volume\s+(?:rm|prune)\b/u)
    expect(diskGuard).not.toContain('removed_anonymous_volumes')
  })
})
