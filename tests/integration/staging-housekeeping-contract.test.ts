import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
describe('staging operational hardening', () => {
  it('diagnoses the actual staging port and fails closed', () => {
    const workflow = readFileSync(path.join(root, '.github/workflows/diag-staging-host.yml'), 'utf8')
    expect(workflow).toContain('STAGING_PORT=3200')
    expect(workflow).toContain('set -euo pipefail')
    expect(workflow).not.toContain('127.0.0.1:3000/api/health')
    expect(workflow).toContain('disk usage critical')
    const promote = readFileSync(path.join(root, '.github/workflows/staging-promote.yml'), 'utf8')
    expect(promote).toContain('--user "$(id -u):$(id -g)" -e HOME=/tmp')
    expect(promote).toContain('unexpected app ownership')
  })
  it('housekeeping preserves current candidate and has dry-run plus safety limit', () => {
    const script = readFileSync(path.join(root, 'ops/staging/housekeeping.sh'), 'utf8')
    expect(script).toContain('--dry-run')
    expect(script).toContain('ACTIVE_CANDIDATE')
    expect(script).toContain('safety limit exceeded')
    expect(script).toContain('.State.Running')
  })
})
