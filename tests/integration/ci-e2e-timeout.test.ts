import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(join(process.cwd(), '.github/workflows/ci.yml'), 'utf8').replace(/\r\n/g, '\n')

function e2eJobTimeoutMinutes(source: string): number {
  const match = source.match(/\n  e2e:\n[\s\S]*?\n    timeout-minutes:\s*(\d+)/)
  if (!match) throw new Error('CI_E2E_TIMEOUT_NOT_FOUND')
  return Number(match[1])
}

describe('CI E2E runtime budget', () => {
  it('keeps enough job time for Supabase reset, production build and the full browser suite', () => {
    expect(e2eJobTimeoutMinutes(workflow)).toBeGreaterThanOrEqual(35)
  })
})
