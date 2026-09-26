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
    expect(step).toContain('if ! npx supabase@2.118.0 start >"$RUNNER_TEMP/supabase-start.log" 2>&1; then')
    expect(step.match(/npx supabase@2\.118\.0 start/g)).toHaveLength(2)
    expect(step).toContain('npx supabase@2.118.0 stop --no-backup || true')
    expect(step).toContain('sleep 5')
  })

  it('captures Supabase startup output so local credentials never reach Actions logs', () => {
    const step = e2eSupabaseStartStep(workflow)
    const starts = step.match(/npx supabase@2\.118\.0 start[^\n]*/g) ?? []
    expect(starts).toHaveLength(2)
    expect(starts[0]).toContain('>"$RUNNER_TEMP/supabase-start.log" 2>&1')
    expect(starts[1]).toContain('>"$RUNNER_TEMP/supabase-start-retry.log" 2>&1')
    expect(step).toContain('trap \'rm -f "$RUNNER_TEMP/supabase-start.log" "$RUNNER_TEMP/supabase-start-retry.log"\' EXIT')
    expect(step).toContain('rm -f "$RUNNER_TEMP/supabase-start.log" "$RUNNER_TEMP/supabase-start-retry.log"')
    expect(step).not.toMatch(/cat .*supabase-start/)
  })
})
