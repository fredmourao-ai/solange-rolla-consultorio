import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const eslintBin = fileURLToPath(new URL('../../node_modules/eslint/bin/eslint.js', import.meta.url))
const sentinelDirs = ['.worktrees/eslint-ignore-contract', 'backups/eslint-ignore-contract']
const sentinelFiles = sentinelDirs.map((dir) => `${dir}/invalid.js`)

describe('ESLint operational directory ignores', () => {
  it('ignores worktree internals instead of linting nested dependencies', () => {
    try {
      for (const [index, dir] of sentinelDirs.entries()) {
        mkdirSync(dir, { recursive: true })
        writeFileSync(sentinelFiles[index], 'const = invalid syntax\n', 'utf8')
      }

      for (const sentinelFile of sentinelFiles) {
        const result = spawnSync(process.execPath, [eslintBin, sentinelFile], { encoding: 'utf8' })
        expect(result.status, `${sentinelFile}\n${result.stdout}\n${result.stderr}`).toBe(0)
      }
    } finally {
      for (const dir of sentinelDirs) rmSync(dir, { recursive: true, force: true })
    }
  }, 45_000)
})
