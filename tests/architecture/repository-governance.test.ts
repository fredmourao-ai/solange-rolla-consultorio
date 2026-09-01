import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))

function indexMode(path: string): string {
  return execFileSync('git', ['ls-files', '-s', '--', path], {
    cwd: root,
    encoding: 'utf8',
  }).trim().split(/\s+/u)[0]
}

function projectFile(path: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), 'utf8')
}

describe('repository governance contract', () => {
  it('keeps versioned Git hooks executable', () => {
    expect(indexMode('.githooks/pre-commit')).toBe('100755')
    expect(indexMode('.githooks/pre-push')).toBe('100755')
  })

  it('routes every GitHub Actions job through the dedicated self-hosted ARM runner', () => {
    const workflowsDir = fileURLToPath(new URL('../../.github/workflows/', import.meta.url))
    const workflows = readdirSync(workflowsDir).filter((name) => name.endsWith('.yml'))

    expect(workflows.length).toBeGreaterThan(0)
    for (const name of workflows) {
      const workflow = readFileSync(workflowsDir + '/' + name, 'utf8')
      const runsOn = workflow.match(/^\s*runs-on:\s*.+$/gmu) ?? []

      for (const line of runsOn) {
        expect(line).not.toContain('ubuntu-latest')
        expect(line).toContain('[self-hosted, Linux, ARM64, solange-ci]')
      }
    }
  })
  it('bootstraps a verified GitHub CLI for self-hosted auto-merge', () => {
    const workflow = projectFile('.github/workflows/pr-auto-merge.yml')

    expect(workflow).toContain('GH_VERSION: 2.98.0')
    expect(workflow).toContain('GH_SHA256: cf689084f3a3618f7eae4a2420d335d74626d65f5e594b9828d125d69f800d86')
    expect(workflow).toContain('sha256sum -c -')
    expect(workflow).toContain('$GITHUB_PATH')
  })
  it('runs repository-specific structural gates before merge', () => {
    const script = projectFile('scripts/repository-governance-validate.sh')

    expect(script).toContain('npm run arch:check')
    expect(script).toContain('npm run modules:check')
    expect(script).toContain('npm run migrations:check')
    expect(script).toContain('--fileParallelism=false')
  })
})
