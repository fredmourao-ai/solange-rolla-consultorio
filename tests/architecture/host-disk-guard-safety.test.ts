import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(new URL('../../scripts/host-disk-guard.sh', import.meta.url))
const workflowPath = fileURLToPath(new URL('../../.github/workflows/host-disk-guard.yml', import.meta.url))
const diskGuard = readFileSync(scriptPath, 'utf8')
const workflow = readFileSync(workflowPath, 'utf8')

describe('host disk guard safety', () => {
  it('does not delete Docker volumes without explicit ownership provenance', () => {
    expect(diskGuard).not.toMatch(/docker\s+volume\s+(?:rm|prune)\b/u)
    expect(diskGuard).not.toContain('removed_anonymous_volumes')
  })

  it('requires externally provisioned signing material before cleanup', () => {
    expect(diskGuard).not.toContain('openssl rand -hex 32')
    const keyGate = diskGuard.indexOf('EXECUTION_PROVENANCE_HMAC_KEY')
    const firstCleanup = diskGuard.indexOf('rm -rf --')
    expect(keyGate).toBeGreaterThanOrEqual(0)
    expect(keyGate).toBeLessThan(firstCleanup)
    expect(diskGuard).toContain('EXECUTION_PROVENANCE_KEY_ID')
  })

  it('keeps host cleanup manual and behind the staging environment gate', () => {
    expect(workflow).not.toContain('schedule:')
    expect(workflow).toContain('environment: staging')
    expect(workflow).toContain('secrets.EXECUTION_PROVENANCE_HMAC_KEY')
    expect(workflow).toContain('vars.EXECUTION_PROVENANCE_KEY_ID')
  })
})
