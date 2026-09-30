import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = fs.readFileSync(
  path.join(process.cwd(), '.github/workflows/absolute-audit-main-guard.yml'),
  'utf8',
)

describe('Absolute Audit Main Guard evidence fallback', () => {
  it('publishes immutable evidence hashes in the run summary', () => {
    expect(workflow).toContain('name: Publish evidence hashes to run summary')
    expect(workflow).toContain('sha256sum')
    expect(workflow).toContain('$GITHUB_STEP_SUMMARY')
  })

  it('does not turn artifact-storage quota exhaustion into a false audit failure', () => {
    expect(workflow).toContain('id: evidence-upload')
    expect(workflow).toMatch(/name: Upload main-guard evidence[\s\S]*continue-on-error: true/)
    expect(workflow).toContain('retention-days: 14')
  })

  it('records a visible fallback warning when artifact upload fails', () => {
    expect(workflow).toContain("steps.evidence-upload.outcome == 'failure'")
    expect(workflow).toContain('validated evidence hashes remain in this run summary')
  })
})
