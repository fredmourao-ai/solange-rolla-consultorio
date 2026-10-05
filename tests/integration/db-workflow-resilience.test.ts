import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync('.github/workflows/db.yml', 'utf8')

describe('database workflow resilience', () => {
  it('stops any inherited canonical Supabase stack before starting a database job', () => {
    expect(workflow).toContain("docker ps -aq --filter name=_solange-rolla-consultorio")
    expect(workflow).toContain('npx supabase@2.118.0 stop --no-backup')
    expect(workflow).toContain('No local Supabase stack to stop.')
  })

  it('retries a failed database start and rebuilds after a failed reset', () => {
    expect(workflow).toContain('Local database failed initial start; retrying once after cleanup.')
    expect(workflow).toContain('supabase-db-start-retry.log')
    expect(workflow).toContain('Database reset failed; rebuilding local stack once.')
    expect(workflow.match(/npx supabase@2\.118\.0 db reset/g)?.length).toBe(2)
  })
})
