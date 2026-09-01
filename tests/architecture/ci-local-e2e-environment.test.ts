import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')
const readWorkflow = () => fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8')

describe('isolated local E2E environment', () => {
  it('parses local Supabase values without shell eval', () => {
    expect(readWorkflow()).not.toMatch(/\beval\b/)
  })

  it('uses a synthetic clinical key source with exactly 32 bytes', () => {
    const match = readWorkflow().match(/CLINICAL_ENCRYPTION_KEY_V1=.*printf '([^']+)'/)
    expect(match).not.toBeNull()
    expect(Buffer.byteLength(match![1], 'utf8')).toBe(32)
  })
})
