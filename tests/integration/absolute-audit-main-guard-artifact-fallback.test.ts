import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = fs.readFileSync(
  path.join(process.cwd(), '.github/workflows/absolute-audit-main-guard.yml'),
  'utf8',
)

describe('Absolute Audit Main Guard evidence fallback', () => {
  it('publishes immutable evidence and hashes in the run summary', () => {
    expect(workflow).toContain('name: Publish quota-independent evidence')
    expect(workflow).toContain('sha256sum "${files[@]}"')
    expect(workflow).toContain('cat "$file"')
    expect(workflow).toContain('run_id=${GITHUB_RUN_ID}')
    expect(workflow).toContain('sha=${GITHUB_SHA}')
    expect(workflow).toContain('$GITHUB_STEP_SUMMARY')
  })

  it('does not turn artifact-storage quota exhaustion into a false audit failure', () => {
    expect(workflow).toMatch(/name: Upload main-guard evidence[\s\S]*continue-on-error: true/)
    expect(workflow).toContain('retention-days: 1')
  })

  it('keeps quota-independent evidence complete even when upload is unavailable', () => {
    for (const artifact of [
      'artifacts/audit-governance-self-test/report.json',
      'artifacts/global-audit-policy/report.json',
      'artifacts/main-merge-provenance/report.json',
    ]) {
      expect(workflow).toContain(artifact)
    }
  })
})
