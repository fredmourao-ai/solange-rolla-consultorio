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

function runnerJobs(content: string): Array<{ name: string; block: string; condition: string }> {
  const lines = content.split(/\r?\n/u)
  const jobsStart = lines.findIndex((line) => /^jobs:\s*$/u.test(line))
  if (jobsStart === -1) return []

  const jobs: Array<{ name: string; block: string; condition: string }> = []
  let currentName: string | undefined
  let currentLines: string[] = []

  function flush() {
    if (currentName && currentLines.some((line) => line.trim() === runnerLine)) {
      const conditionLine = currentLines.find((line) => /^    if:\s*/u.test(line))
      jobs.push({
        name: currentName,
        block: currentLines.join('\n'),
        condition: conditionLine?.replace(/^    if:\s*/u, '') ?? '',
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
      if (!/^\s*pull_request:/mu.test(workflow.content)) continue

      for (const job of runnerJobs(workflow.content)) {
        expect(job.condition, `${workflow.name}:${job.name}`).toContain(sameRepoGuard)
      }
    }
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
