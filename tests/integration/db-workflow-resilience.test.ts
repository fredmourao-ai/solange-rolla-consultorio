import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync('.github/workflows/db.yml', 'utf8')

describe('database workflow resilience', () => {
  it('removes stale project containers when the expected Supabase network is missing', () => {
    expect(workflow).toContain('Clean stale local Supabase runtime')
    expect(workflow).toContain('network="supabase_network_$project"')
    expect(workflow).toContain("docker ps -a --format '{{.Names}}' | grep -q \"_$project$\"")
    expect(workflow).toContain('! docker network inspect "$network"')
    expect(workflow).toContain("grep \"_$project$\" | xargs -r docker rm -f")
  })
})
