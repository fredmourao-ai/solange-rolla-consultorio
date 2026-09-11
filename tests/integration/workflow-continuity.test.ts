import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const governance = readFileSync('.github/workflows/repository-governance.yml', 'utf8')
const autoMerge = readFileSync('.github/workflows/pr-auto-merge.yml', 'utf8')

describe('workflow continuity under rapid PR updates', () => {
  it('cancels obsolete repository-governance runs for the same PR/ref', () => {
    expect(governance).toContain('concurrency:')
    expect(governance).toContain("github.event.pull_request.number || github.ref")
    expect(governance).toContain('cancel-in-progress: true')
  })

  it('coalesces duplicate auto-merge workflow-run triggers for the same SHA', () => {
    expect(autoMerge).toContain('group: pr-auto-merge-${{ github.event.workflow_run.head_sha }}')
    expect(autoMerge).toContain('cancel-in-progress: true')
  })
})
