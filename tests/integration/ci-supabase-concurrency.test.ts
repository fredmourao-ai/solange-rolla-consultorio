import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8')
const dbWorkflow = readFileSync('.github/workflows/db.yml', 'utf8')

function jobBlock(source: string, job: string) {
  const start = source.indexOf(`  ${job}:\n`)
  if (start === -1) throw new Error(`JOB_NOT_FOUND:${job}`)
  const rest = source.slice(start + 1)
  const next = rest.search(/^  [a-zA-Z0-9_-]+:\n/m)
  const end = next === -1 ? source.length : start + 1 + next
  return source.slice(start, end)
}

describe('local Supabase CI serialization', () => {
  it('uses one non-cancelling concurrency lock for CI e2e and database jobs', () => {
    const e2e = jobBlock(ciWorkflow, 'e2e')
    const db = jobBlock(dbWorkflow, 'db')

    for (const block of [e2e, db]) {
      expect(block).toContain('concurrency:')
      expect(block).toContain('group: solange-local-supabase')
      expect(block).toContain('cancel-in-progress: false')
    }
  })

  it('keeps non-Supabase CI jobs outside the global local-database lock', () => {
    for (const job of ['lint', 'typecheck', 'unit', 'architecture', 'build']) {
      const block = jobBlock(ciWorkflow, job)
      expect(block).not.toContain('group: solange-local-supabase')
    }
  })
})
