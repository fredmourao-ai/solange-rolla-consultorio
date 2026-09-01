import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const workflowsDir = fileURLToPath(new URL('../../.github/workflows/', import.meta.url))
const runnerLine = 'runs-on: [self-hosted, Linux, ARM64, solange-ci]'
const sameRepoGuard = 'github.event.pull_request.head.repo.full_name == github.repository'

function workflows(): Array<{ name: string; content: string }> {
  return readdirSync(workflowsDir)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .map((name) => ({
      name,
      content: readFileSync(path.join(workflowsDir, name), 'utf8'),
    }))
}

function jobLevelCondition(lines: string[]): string {
  const ifIndex = lines.findIndex((line) => /^    if:\s*/u.test(line))
  if (ifIndex === -1) return ''

  const inline = lines[ifIndex]?.replace(/^    if:\s*/u, '') ?? ''
  if (!/^[>|][+-]?\s*$/u.test(inline)) return inline

  const continuations: string[] = []
  for (const line of lines.slice(ifIndex + 1)) {
    if (/^    \S/u.test(line)) break
    if (/^\s{6,}\S/u.test(line)) continuations.push(line.trim())
  }
  return continuations.join(' ')
}

function runnerJobs(content: string): Array<{ name: string; block: string; condition: string }> {
  const lines = content.split(/\r?\n/u)
  const jobsStart = lines.findIndex((line) => /^jobs:\s*$/u.test(line))
  if (jobsStart === -1) return []

  const jobs: Array<{ name: string; block: string; condition: string }> = []
  let currentName: string | undefined
  let currentLines: string[] = []

  function flush() {
    if (currentName && currentLines.some((line) => line.trim() === runnerLine)) {
      jobs.push({
        name: currentName,
        block: currentLines.join('\n'),
        condition: jobLevelCondition(currentLines),
      })
    }
  }

  for (const line of lines.slice(jobsStart + 1)) {
    if (/^\S/u.test(line) && line.trim() !== '' && !line.startsWith('#')) break

    const job = line.match(/^  ([A-Za-z_][A-Za-z0-9_-]*):\s*$/u)
    if (job) {
      flush()
      currentName = job[1]
      currentLines = [line]
      continue
    }
    if (currentName) currentLines.push(line)
  }
  flush()
  return jobs
}

function hasPullRequestTrigger(content: string): boolean {
  const lines = content.split(/\r?\n/u)
  const onIndex = lines.findIndex((line) => /^(?:on|"on"|'on'):\s*/u.test(line))
  if (onIndex === -1) return false

  const inline = lines[onIndex]?.replace(/^(?:on|"on"|'on'):\s*/u, '') ?? ''
  if (inline.trim()) {
    return /(?:^|[\s,\[{])["']?pull_request["']?(?=\s*(?::|[,}\]]|$))/u.test(inline)
  }

  for (const line of lines.slice(onIndex + 1)) {
    if (/^\S/u.test(line) && line.trim() !== '' && !line.startsWith('#')) break
    if (/^\s{2}(?:-\s*)?["']?pull_request["']?(?:\s*:|\s*$)/u.test(line)) return true
  }
  return false
}

function conditionRequiresSameRepoOnPullRequest(condition: string): boolean {
  let normalized = condition
    .replace(/^\$\{\{\s*/u, '')
    .replace(/\s*\}\}$/u, '')
    .replace(/\s+/gu, ' ')
    .trim()

  while (normalized.startsWith('(') && normalized.endsWith(')')) {
    normalized = normalized.slice(1, -1).trim()
  }
  const escapedGuard = sameRepoGuard.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const positiveGuard = new RegExp(`(?:^|&&)\\s*\\(?\\s*${escapedGuard}\\s*\\)?\\s*(?=&&|$)`, 'u')

  const firstOr = normalized.indexOf('||')
  if (firstOr === -1) return positiveGuard.test(normalized)

  const nonPullRequestBranch = normalized.slice(0, firstOr).trim()
  const pullRequestBranch = normalized.slice(firstOr + 2).trim()
  if (nonPullRequestBranch !== "github.event_name != 'pull_request'") return false
  if (pullRequestBranch.includes('||')) return false
  return positiveGuard.test(pullRequestBranch)
}

describe('GitHub Actions runner policy', () => {
  it('routes every workflow job through the Solange self-hosted runner', () => {
    for (const workflow of workflows()) {
      const runsOnLines = workflow.content.match(/^\s*runs-on:.*$/gmu) ?? []
      for (const line of runsOnLines) {
        expect(line.trim(), `${workflow.name}: ${line.trim()}`).toBe(runnerLine)
      }
    }
  })

  it('guards every pull-request runner job at job level', () => {
    for (const workflow of workflows()) {
      if (!hasPullRequestTrigger(workflow.content)) continue

      for (const job of runnerJobs(workflow.content)) {
        expect(conditionRequiresSameRepoOnPullRequest(job.condition), `${workflow.name}:${job.name}`).toBe(true)
      }
    }
  })

  it('rejects a same-repository guard that can be bypassed by an OR branch', () => {
    const workflow = [
      'jobs:',
      '  exposed:',
      '    if: ${{ ' + sameRepoGuard + " || github.event_name == 'pull_request' }}",
      `    ${runnerLine}`,
    ].join('\n')
    const [job] = runnerJobs(workflow)

    expect(conditionRequiresSameRepoOnPullRequest(job?.condition ?? '')).toBe(false)
  })

  it('rejects negated or comparison forms of the same-repository predicate', () => {
    expect(conditionRequiresSameRepoOnPullRequest(`!${sameRepoGuard}`)).toBe(false)
    expect(conditionRequiresSameRepoOnPullRequest(`${sameRepoGuard} == false`)).toBe(false)
    expect(conditionRequiresSameRepoOnPullRequest(`!(${sameRepoGuard})`)).toBe(false)
    expect(conditionRequiresSameRepoOnPullRequest(`(${sameRepoGuard}) == false`)).toBe(false)
  })
  it('recognizes inline and quoted pull-request trigger syntax', () => {
    expect(hasPullRequestTrigger('on: [push, pull_request]\n')).toBe(true)
    expect(hasPullRequestTrigger('"on":\n  "pull_request":\n')).toBe(true)
    expect(hasPullRequestTrigger("'on':\n  - 'pull_request'\n")).toBe(true)
    expect(hasPullRequestTrigger('on: {pull_request: {}, push: {}}\n')).toBe(true)
  })
  it('accepts a folded job-level runner guard', () => {
    const workflow = [
      'jobs:',
      '  guarded:',
      '    if: >-',
      "      github.event_name != 'pull_request' ||",
      `      ${sameRepoGuard}`,
      `    ${runnerLine}`,
    ].join('\n')
    const [job] = runnerJobs(workflow)

    expect(job?.condition).toContain(sameRepoGuard)
  })

  it('does not let duplicate guards in one job cover an unguarded runner job', () => {
    const workflow = [
      'jobs:',
      '  guarded:',
      '    if: ${{ ' + sameRepoGuard + ' && ' + sameRepoGuard + ' }}',
      `    ${runnerLine}`,
      '  exposed:',
      `    ${runnerLine}`,
    ].join('\n')
    const jobs = runnerJobs(workflow)

    expect(jobs).toHaveLength(2)
    expect(jobs[0]?.condition).toContain(sameRepoGuard)
    expect(jobs[1]?.condition).not.toContain(sameRepoGuard)
  })

  it('does not accept a step-level guard as a job-level runner guard', () => {
    const workflow = [
      'jobs:',
      '  exposed:',
      `    ${runnerLine}`,
      '    steps:',
      '      - if: ${{ ' + sameRepoGuard + ' }}',
      '        run: echo guarded-step',
    ].join('\n')
    const [job] = runnerJobs(workflow)

    expect(job?.block).toContain(sameRepoGuard)
    expect(job?.condition).not.toContain(sameRepoGuard)
  })
})
