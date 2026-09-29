import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { findDirectIssueCommentListeners, type IssueCommentListener } from '../../scripts/governance/check-issue-comment-listeners.mjs'

const workflowsDir = path.resolve('.github/workflows')

let fixtureDir: string | undefined

afterEach(() => {
  if (fixtureDir) {
    rmSync(fixtureDir, { recursive: true, force: true })
    fixtureDir = undefined
  }
})

function makeFixtureDir(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'issue-comment-listener-guard-'))
  fixtureDir = dir
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), content, 'utf8')
  }
  return dir
}

describe('issue_comment listener guard', () => {
  it('flags two workflows that both declare a direct top-level issue_comment trigger', () => {
    const dir = makeFixtureDir({
      'a.yml': ['name: A', 'on:', '  issue_comment:', '    types: [created]', 'jobs:', '  x:', '    runs-on: ubuntu-latest', '    steps: []', ''].join('\n'),
      'b.yml': ['name: B', 'on: [issue_comment]', 'jobs:', '  x:', '    runs-on: ubuntu-latest', '    steps: []', ''].join('\n'),
    })

    const listeners = findDirectIssueCommentListeners(dir)

    expect(listeners.length).toBe(2)
    expect(listeners.map((l: IssueCommentListener) => path.basename(l.file)).sort()).toEqual(['a.yml', 'b.yml'])
  })

  it('passes when zero workflows declare a direct issue_comment trigger', () => {
    const dir = makeFixtureDir({
      'push-only.yml': ['name: Push only', 'on:', '  push:', '    branches: [main]', 'jobs:', '  x:', '    runs-on: ubuntu-latest', '    steps: []', ''].join('\n'),
    })

    expect(findDirectIssueCommentListeners(dir).length).toBe(0)
  })

  it('passes when exactly one workflow declares a direct issue_comment trigger', () => {
    const dir = makeFixtureDir({
      'listener.yml': ['name: Listener', 'on:', '  issue_comment:', '    types: [created]', 'jobs:', '  x:', '    runs-on: ubuntu-latest', '    steps: []', ''].join('\n'),
      'other.yml': ['name: Other', 'on:', '  pull_request:', 'jobs:', '  x:', '    runs-on: ubuntu-latest', '    steps: []', ''].join('\n'),
    })

    expect(findDirectIssueCommentListeners(dir).length).toBe(1)
  })

  it('ignores disabled workflows and archive/historical subdirectories', () => {
    const dir = makeFixtureDir({})
    writeFileSync(path.join(dir, 'disabled-listener.yml.disabled'), 'on: issue_comment\n', 'utf8')
    const archiveDir = path.join(dir, 'archive')
    const historicalDir = path.join(dir, 'historical')
    mkdirSync(archiveDir)
    mkdirSync(historicalDir)
    writeFileSync(path.join(archiveDir, 'old.yml'), 'on: issue_comment\n', 'utf8')
    writeFileSync(path.join(historicalDir, 'old.yml'), 'on: issue_comment\n', 'utf8')

    expect(findDirectIssueCommentListeners(dir).length).toBe(0)
  })

  it('does not flag issue_comment mentioned only inside job/step content, not as a top-level trigger', () => {
    const dir = makeFixtureDir({
      'mentions-only.yml': [
        'name: Mentions only',
        'on:',
        '  push:',
        'jobs:',
        '  x:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - run: echo "issue_comment is just a string here"',
        '',
      ].join('\n'),
    })

    expect(findDirectIssueCommentListeners(dir).length).toBe(0)
  })

  it('confirms the real repository has at most 1 active direct issue_comment listener', () => {
    const listeners = findDirectIssueCommentListeners(workflowsDir)
    expect(listeners.length).toBeLessThanOrEqual(1)
  })
})
