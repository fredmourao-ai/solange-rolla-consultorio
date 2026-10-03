import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync('.github/workflows/db.yml', 'utf8')

describe('database workflow resilience', () => {
  it('stops any inherited canonical Supabase stack before starting a database job', () => {
    expect(workflow).toContain("if docker ps -a --format '{{.Names}}' | grep -q \"_$project$\"; then")
    expect(workflow).toContain('npx supabase@2.118.0 stop --no-backup || true')
  })

  it('removes stale project containers when the expected Supabase network is missing', () => {
    expect(workflow).toContain('Clean stale local Supabase runtime')
    expect(workflow).toContain('network="supabase_network_$project"')
    expect(workflow).toContain("docker ps -a --format '{{.Names}}' | grep -q \"_$project$\"")
    expect(workflow).toContain('! docker network inspect "$network"')
    expect(workflow).toContain("grep \"_$project$\" | xargs -r docker rm -f")
  })
})
