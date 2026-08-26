import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('synthetic seed isolation', () => {
  it('passes the repository seed through the synthetic-data verifier', () => {
    const output = execFileSync(process.execPath, [path.join(process.cwd(), 'scripts/verify-synthetic-seed.mjs')], {
      encoding: 'utf8',
    })

    expect(output).toContain('synthetic seed verification passed')
  })
})
