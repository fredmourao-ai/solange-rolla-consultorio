import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(join(process.cwd(), '.github/workflows/pr-auto-merge.yml'), 'utf8')

describe('post-merge main revalidation', () => {
  it('revalidates main when another trusted mechanism already merged the exact PR head', () => {
    expect(workflow).toContain('select(.merged_at != null)')
    expect(workflow).toContain('merged_main_sha=')
    expect(workflow).toContain("steps.pr.outputs.pr_number != '' || steps.pr.outputs.merged_main_sha != ''")
  })

  it('does not repeatedly dispatch the same exact main SHA', () => {
    expect(workflow).toContain('event=workflow_dispatch')
    expect(workflow).toContain('Skipping already-dispatched')
  })

  it('dispatches and waits for the Absolute Audit Main Guard before staging handoff', () => {
    expect(workflow).toContain(
      'for workflow in ci.yml db.yml repository-governance.yml absolute-audit-main-guard.yml',
    )
    expect(workflow).toContain(
      "required=('CI' 'Database' 'Repository Governance Gate' 'Absolute Audit Main Guard')",
    )
  })
})
