import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))
const requiredRunnerLabels = ['self-hosted', 'Linux', 'ARM64', 'solange-ci']

function indexMode(path: string): string {
  return execFileSync('git', ['ls-files', '-s', '--', path], {
    cwd: root,
    encoding: 'utf8',
  }).trim().split(/\s+/u)[0]
}

function projectFile(path: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), 'utf8')
}

function cleanYamlScalar(value: string): string {
  return value.trim().replace(/^['"]|['"]$/gu, '')
}

function runsOnLabels(workflow: string): string[][] {
  const lines = workflow.split(/\r?\n/u)
  const declarations: string[][] = []

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)runs-on:\s*(.*)$/u)
    if (!match) continue
    const indent = match[1].length
    const inline = match[2].trim()

    if (inline.startsWith('[') && inline.endsWith(']')) {
      declarations.push(inline.slice(1, -1).split(',').map(cleanYamlScalar))
      continue
    }

    if (inline) {
      declarations.push([cleanYamlScalar(inline)])
      continue
    }

    const labels: string[] = []
    for (let child = index + 1; child < lines.length; child += 1) {
      if (!lines[child].trim()) continue
      const listItem = lines[child].match(/^(\s*)-\s*(.+)$/u)
      if (!listItem || listItem[1].length <= indent) break
      labels.push(cleanYamlScalar(listItem[2]))
    }
    declarations.push(labels)
  }

  return declarations
}

describe('repository governance contract', () => {
  it('keeps versioned Git hooks executable', () => {
    expect(indexMode('.githooks/pre-commit')).toBe('100755')
    expect(indexMode('.githooks/pre-push')).toBe('100755')
  })

  it('invokes the pre-push governance validator through Bash', () => {
    const hook = projectFile('.githooks/pre-push')
    expect(hook).toContain('bash "$root/scripts/repository-governance-validate.sh" pre-push')
  })

  it('parses inline and multiline self-hosted runner declarations', () => {
    const fixture = `jobs:
  inline:
    runs-on: [self-hosted, Linux, ARM64, solange-ci]
  multiline:
    runs-on:
      - self-hosted
      - Linux
      - ARM64
      - solange-ci`

    expect(runsOnLabels(fixture)).toEqual([
      requiredRunnerLabels,
      requiredRunnerLabels,
    ])
  })

  it('routes every GitHub Actions job through the dedicated self-hosted ARM runner', () => {
    const workflowsDir = fileURLToPath(new URL('../../.github/workflows/', import.meta.url))
    const workflows = readdirSync(workflowsDir).filter((name) => name.endsWith('.yml'))

    expect(workflows.length).toBeGreaterThan(0)
    for (const name of workflows) {
      const workflow = readFileSync(workflowsDir + '/' + name, 'utf8')
      const declarations = workflow.match(/^\s*runs-on:/gmu) ?? []
      const parsed = runsOnLabels(workflow)

      expect(parsed).toHaveLength(declarations.length)
      for (const labels of parsed) {
        expect(labels).toEqual(requiredRunnerLabels)
      }
    }
  })

  it('bootstraps a verified GitHub CLI for self-hosted auto-merge', () => {
    const workflow = projectFile('.github/workflows/pr-auto-merge.yml')

    expect(workflow).toContain('GH_VERSION: 2.98.0')
    expect(workflow).toContain('GH_SHA256: cf689084f3a3618f7eae4a2420d335d74626d65f5e594b9828d125d69f800d86')
    expect(workflow).toContain('sha256sum -c -')
    expect(workflow).toContain('$GITHUB_PATH')
    expect(workflow).not.toContain('command -v gh')
  })

  it('runs repository-specific structural gates before merge', () => {
    const script = projectFile('scripts/repository-governance-validate.sh')

    expect(script).toContain('npm run arch:check')
    expect(script).toContain('npm run modules:check')
    expect(script).toContain('npm run migrations:check')
    expect(script).toContain('--fileParallelism=false')
  })
})
