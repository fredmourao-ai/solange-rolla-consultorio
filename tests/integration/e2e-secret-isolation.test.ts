import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8').replace(/\r\n/g, '\n')
const e2e = workflow.split('\n  e2e:')[1] ?? ''
const prepare = e2e.split('      - name: Prepare local E2E environment')[1]?.split('      - name: Build application')[0] ?? ''
const build = e2e.split('      - name: Build application')[1]?.split('      - name: Install Playwright browser')[0] ?? ''
const run = e2e.split('      - name: End-to-end tests')[1]?.split('      - name: Stop isolated local Supabase')[0] ?? ''

describe('local E2E secret isolation', () => {
  it('keeps dynamic Supabase credentials out of GITHUB_ENV', () => {
    expect(prepare).not.toContain('SUPABASE_SECRET_KEY=$SECRET_KEY')
    expect(prepare).not.toContain('>> "$GITHUB_ENV"')
    expect(prepare).toContain('chmod 600')
  })

  it('loads the private environment only inside build and browser shells', () => {
    expect(prepare).toContain('E2E_ENV_FILE=')
    expect(build).toContain('source "$E2E_ENV_FILE"')
    expect(run).toContain('source "$E2E_ENV_FILE"')
  })

  it('removes the private environment after the E2E job', () => {
    expect(e2e).toContain('rm -f "$E2E_ENV_FILE"')
  })
})
