import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')
const readWorkflow = () => fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8')

describe('isolated local E2E environment', () => {
  it('parses local Supabase values without shell eval', () => {
    expect(readWorkflow()).not.toMatch(/\beval\b/)
  })

  it('generates synthetic secret material at runtime instead of embedding it in workflow logs', () => {
    const workflow = readWorkflow()
    expect(workflow).toContain('openssl rand -base64 32')
    expect(workflow).toContain('openssl rand -hex 32')
    expect(workflow).toContain('chmod 600 "$E2E_ENV_FILE"')
    expect(workflow).not.toContain("printf 'solange-ci-local-e2e-key-0000001'")
  })
})
