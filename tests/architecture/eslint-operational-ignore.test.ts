import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const eslintBin = fileURLToPath(new URL('../../node_modules/eslint/bin/eslint.js', import.meta.url))
const sentinelDirs = ['.worktrees/eslint-ignore-contract', 'backups/eslint-ignore-contract']
const sentinelFiles = sentinelDirs.map((dir) => `${dir}/invalid.js`)

for (const [index, dir] of sentinelDirs.entries()) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(sentinelFiles[index], 'const = invalid syntax\n', 'utf8')
}

afterAll(() => {
  for (const dir of sentinelDirs) rmSync(dir, { recursive: true, force: true })
})

describe('ESLint operational directory ignores', () => {
  it('ignores worktree internals instead of linting nested dependencies', () => {
    for (const sentinelFile of sentinelFiles) {
      const result = spawnSync(process.execPath, [eslintBin, sentinelFile], { encoding: 'utf8' })
      expect(result.status, `${sentinelFile}\n${result.stdout}\n${result.stderr}`).toBe(0)
    }
  }, 45_000)
})
