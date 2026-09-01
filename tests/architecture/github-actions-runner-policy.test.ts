import { readdirSync, readFileSync } from 'node:fs'
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
      content: readFileSync(`${workflowsDir}${name}`, 'utf8'),
    }))
}

function occurrences(content: string, needle: string): number {
  return content.split(needle).length - 1
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

  it('guards every pull-request job before using the privileged runner', () => {
    for (const workflow of workflows()) {
      if (!/^\s*pull_request:/mu.test(workflow.content)) continue

      const runnerJobs = (workflow.content.match(/^\s*runs-on:.*$/gmu) ?? []).length
      const guards = occurrences(workflow.content, sameRepoGuard)

      expect(
        guards,
        `${workflow.name}: ${guards} same-repo guards for ${runnerJobs} runner jobs`,
      ).toBeGreaterThanOrEqual(runnerJobs)
    }
  })
})
