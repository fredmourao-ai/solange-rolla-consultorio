import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const vitestBin = fileURLToPath(
  new URL('../../node_modules/vitest/vitest.mjs', import.meta.url),
)

describe('Vitest operational directory ignores', () => {
  it('does not discover tests from worktrees or backups', () => {
    const result = spawnSync(process.execPath, [vitestBin, 'list', '--filesOnly', '--staticParse'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    })
    const output = `${result.stdout}\n${result.stderr}`
    expect(result.status, output).toBe(0)
    expect(output).not.toContain('.worktrees/')
    expect(output).not.toContain('backups/')
  }, 45_000)
})
