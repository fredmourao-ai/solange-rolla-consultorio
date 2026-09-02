import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))
const forbiddenProjectMarkers = [
  'mei-mg-email',
  'mei-mg-email-ndr-guard.service',
  'mei-mg-email-worker.service',
]

describe('project boundary governance', () => {
  it('keeps Solange workflows free from operational references to other projects', () => {
    const workflowsDir = fileURLToPath(new URL('../../.github/workflows/', import.meta.url))
    const workflows = readdirSync(workflowsDir).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))

    for (const workflowName of workflows) {
      const workflow = readFileSync(`${workflowsDir}/${workflowName}`, 'utf8')
      for (const marker of forbiddenProjectMarkers) {
        expect(workflow, `${workflowName} must not reference ${marker}`).not.toContain(marker)
      }
    }
  })

  it('enforces the same project-boundary rule in the repository governance validator', () => {
    const validator = readFileSync(`${root}/scripts/repository-governance-validate.sh`, 'utf8')
    expect(validator).toContain('check_project_boundaries')
  })
})
