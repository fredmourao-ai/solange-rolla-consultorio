import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const ci = readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8')
const db = readFileSync(path.join(root, '.github/workflows/db.yml'), 'utf8')

describe('ephemeral Supabase workflow cleanup', () => {
  it('always stops the E2E stack after browser tests', () => {
    const e2e = ci.split('\n  e2e:')[1] ?? ''
    const cleanup = e2e.indexOf('Stop isolated local Supabase')
    expect(cleanup).toBeGreaterThan(e2e.indexOf('npm run test:e2e'))
    expect(e2e.slice(cleanup)).toContain('if: always()')
    expect(e2e.slice(cleanup)).toContain('supabase@2.115.0 stop --no-backup')
  })

  it('always stops the database test stack after type verification', () => {
    const cleanup = db.indexOf('Stop isolated local Supabase')
    expect(cleanup).toBeGreaterThan(db.indexOf('Verify generated database types are current'))
    expect(db.slice(cleanup)).toContain('if: always()')
    expect(db.slice(cleanup)).toContain('supabase@2.115.0 stop --no-backup')
  })
})
