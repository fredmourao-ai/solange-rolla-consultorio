import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repositoryRoot = process.cwd()
const dependencyCruiserCli = path.join(
  repositoryRoot,
  'node_modules/dependency-cruiser/bin/dependency-cruise.mjs',
)

function cruise(fixture: string) {
  return spawnSync(
    process.execPath,
    [
      dependencyCruiserCli,
      fixture,
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      'err-long',
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
    },
  )
}

describe('dependency boundaries', () => {
  it('rejects a cross-module internal import for the named rule', () => {
    const result = cruise(
      'tests/architecture/fixtures/forbidden-cross-module-import.ts',
    )
    const output = `${result.stdout}\n${result.stderr}`

    expect(result.status).not.toBe(0)
    expect(output).toContain('cross-module-internal-import')
  }, 30_000)

  it('allows a cross-module import through public.ts', () => {
    const result = cruise(
      'tests/architecture/fixtures/allowed-public-import.ts',
    )

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  }, 30_000)
})
