import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const governance = readFileSync('.github/workflows/repository-governance.yml', 'utf8')
const autoMerge = readFileSync('.github/workflows/pr-auto-merge.yml', 'utf8')
const staging = readFileSync('.github/workflows/staging-promote.yml', 'utf8')

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

  it('keeps merge control-plane work off the scarce self-hosted application runner', () => {
    expect(autoMerge).toContain('runs-on: ubuntu-latest')
    expect(autoMerge).toContain('linux_amd64.tar.gz')
    expect(autoMerge).toContain('3b8ac6b30336802fc1a858d7c084e11cdf24ac1a761ca90b68022d7d729208de')
    expect(autoMerge).not.toContain('runs-on: [self-hosted, Linux, ARM64, solange-ci]')
  })

  it('filters canonical staging checks by event before applying the 100-run API limit', () => {
    expect(staging).toContain("new URLSearchParams({ head_sha: sha, event, per_page: '100' })")
    expect(staging).not.toContain("new URLSearchParams({ head_sha: sha, per_page: '100' })")
  })
})
