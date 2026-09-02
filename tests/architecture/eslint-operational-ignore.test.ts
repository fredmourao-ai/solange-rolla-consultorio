import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const eslintConfig = readFileSync(
  fileURLToPath(new URL('../../eslint.config.mjs', import.meta.url)),
  'utf8',
)

describe('ESLint operational directory ignores', () => {
  it('keeps worktrees and backups in the global ignore contract', () => {
    expect(eslintConfig).toContain('globalIgnores([')
    expect(eslintConfig).toContain("'.worktrees/**'")
    expect(eslintConfig).toContain("'backups/**'")
  })
})
