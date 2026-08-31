import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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

  it('runs repository-specific structural gates before merge', () => {
    const script = projectFile('scripts/repository-governance-validate.sh')

    expect(script).toContain('npm run arch:check')
    expect(script).toContain('npm run modules:check')
    expect(script).toContain('npm run migrations:check')
    expect(script).toContain('--fileParallelism=false')
  })
})
