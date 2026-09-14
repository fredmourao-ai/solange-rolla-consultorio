import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(join(process.cwd(), '.github/workflows/ci.yml'), 'utf8')

function e2eSupabaseStartStep(source: string): string {
  const match = source.match(/- name: Start and reset isolated local Supabase[\s\S]*?(?=\n      - name: Prepare local E2E environment)/)
  if (!match) throw new Error('CI_E2E_SUPABASE_START_STEP_NOT_FOUND')
  return match[0]
}

describe('CI E2E Supabase startup resilience', () => {
  it('retries startup exactly once after a transient health-check failure', () => {
    const step = e2eSupabaseStartStep(workflow)
    expect(step).toContain('if ! npx supabase@2.115.0 start; then')
    expect(step.match(/npx supabase@2\.115\.0 start/g)).toHaveLength(2)
    expect(step).toContain('npx supabase@2.115.0 stop --no-backup || true')
    expect(step).toContain('sleep 5')
  })
})
