import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = path.join(process.cwd(), '.github/workflows/historical-state-audit.yml')

describe('historical state audit concurrency', () => {
  it('does not allow an automatic trigger to cancel a manual exact-SHA audit', () => {
    const source = readFileSync(workflow, 'utf8')

    expect(source).toContain("group: historical-state-audit-${{ github.event_name == 'workflow_dispatch' && 'manual' || 'automatic' }}")
    expect(source).toContain("cancel-in-progress: ${{ github.event_name == 'workflow_run' }}")
  })
})
