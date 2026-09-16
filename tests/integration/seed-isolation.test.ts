import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('synthetic seed isolation', () => {
  it('passes the repository seed through the synthetic-data verifier', () => {
    const output = execFileSync(process.execPath, [path.join(process.cwd(), 'scripts/verify-synthetic-seed.mjs')], {
      encoding: 'utf8',
    })

    expect(output).toContain('synthetic seed verification passed')
  })

  it('does not mutate an existing accepted legal version when reseeding', () => {
    const seed = readFileSync(path.join(process.cwd(), 'supabase/seed.sql'), 'utf8')
    const statement = seed.match(
      /insert into public\.legal_document_versions \([\s\S]*?where d\.key = 'cancellation_policy'[\s\S]*?on conflict \(document_id, version\) do ([\s\S]*?);/,
    )

    expect(statement, 'cancellation policy legal version seed statement').not.toBeNull()
    expect(statement?.[1].trim()).toBe('nothing')
  })
})
