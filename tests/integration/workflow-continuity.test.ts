import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const governance = readFileSync('.github/workflows/repository-governance.yml', 'utf8')
const autoMerge = readFileSync('.github/workflows/pr-auto-merge.yml', 'utf8')
const staging = readFileSync('.github/workflows/staging-promote.yml', 'utf8')
const ci = readFileSync('.github/workflows/ci.yml', 'utf8')
const database = readFileSync('.github/workflows/db.yml', 'utf8')

describe('workflow continuity under rapid PR updates', () => {
  it('cancels obsolete repository-governance runs for the same PR/ref', () => {
    expect(governance).toContain('concurrency:')
    expect(governance).toContain("github.event.pull_request.number || github.ref")
    expect(governance).toContain('cancel-in-progress: true')
  })

  it('coalesces stale auto-merge evaluations repository-wide off private CI runners', () => {
    expect(autoMerge).toContain('group: pr-auto-merge-${{ github.repository }}')
    expect(autoMerge).toContain('runs-on: ubuntu-latest')
    expect(autoMerge).not.toContain('solange-control')
    expect(autoMerge).toContain('cancel-in-progress: true')
  })

  it('skips auto-merge cleanly when a green PR is no longer mergeable', () => {
    expect(autoMerge).toContain("mergeable_state=\"$(jq -r '.mergeable_state // \"unknown\"' <<<\"$current_pr\")\"")
    expect(autoMerge).toContain('if [ "$mergeable_state" != "clean" ]; then')
    expect(autoMerge).toContain('is not currently mergeable')
  })

  it('does not globally serialize host-local Supabase jobs across independent runners', () => {
    expect(ci).not.toContain('group: solange-supabase-docker-stack')
    expect(database).not.toContain('group: solange-supabase-docker-stack')
  })

  it('filters canonical staging checks by event before applying the 100-run API limit', () => {
    expect(staging).toContain("new URLSearchParams({ head_sha: sha, event, per_page: '100' })")
    expect(staging).not.toContain("new URLSearchParams({ head_sha: sha, per_page: '100' })")
  })

  it('recreates the staging web container so runtime env tracks the promoted SHA', () => {
    expect(staging).toContain('docker run -d --name "$WEB"')
    expect(staging).toContain('--env-file "$RUNTIME_ENV"')
    expect(staging).toContain('docker rename "$WEB" "${WEB}-previous"')
    expect(staging).toContain('docker rename "${WEB}-previous" "$WEB"')
    expect(staging).not.toContain('docker start "$WEB" >/dev/null\n          docker restart "$RECONCILER"')
  })
})
