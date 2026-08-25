import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repositoryRoot = process.cwd()
const dependencyCruiserCli = path.join(
  repositoryRoot,
  'node_modules/dependency-cruiser/bin/dependency-cruise.mjs',
)

function cruise(fixtures: string[]) {
  return spawnSync(
    process.execPath,
    [
      dependencyCruiserCli,
      ...fixtures,
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
  it('rejects every forbidden dependency class for the named rule', () => {
    const result = cruise([
      'tests/architecture/fixtures/forbidden-cross-module-import.ts',
      'tests/architecture/fixtures/forbidden-future-module-import.ts',
      'tests/architecture/fixtures/forbidden-domain-dependency.ts',
      'tests/architecture/fixtures/forbidden-platform-dependency.ts',
      'tests/architecture/fixtures/forbidden-shared-dependency.ts',
      'tests/architecture/fixtures/forbidden-app-internal-import.ts',
      'tests/architecture/fixtures/forbidden-cycle.ts',
    ])
    const output = `${result.stdout}\n${result.stderr}`

    expect(result.status).not.toBe(0)
    expect(output).toContain('cross-module-internal-import-from-appointments')
    expect(output).toContain('cross-module-internal-import-from-future-module')
    expect(output).toContain('domain-outer-layer-dependency')
    expect(output).toContain('platform-does-not-depend-on-modules')
    expect(output).toContain('shared-does-not-depend-on-modules')
    expect(output).toContain('app-module-contracts-only')
    expect(output).toContain('no-circular-dependencies')
  }, 180_000)

  it('allows a cross-module import through public.ts', () => {
    const result = cruise([
      'tests/architecture/fixtures/allowed-public-import.ts',
    ])

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  }, 180_000)
})
