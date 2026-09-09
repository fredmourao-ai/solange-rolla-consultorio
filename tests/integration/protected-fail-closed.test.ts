import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('protected application routes fail closed', () => {
  it('validates that the shared protected layout session is active', () => {
    const source = readFileSync('src/app/(protected)/layout.tsx', 'utf8')

    expect(source).toContain('authorizeStaffSession(session,')
  })

  it('rejects every failed finance operations read', () => {
    const source = readFileSync('src/app/(protected)/financeiro/operacoes/page.tsx', 'utf8')
    const expectedResults = [
      'receivablesResult',
      'paymentsResult',
      'vendorsResult',
      'categoriesResult',
      'payablesResult',
      'rulesResult',
    ]
    expect(source).toContain(`const results = [${expectedResults.join(', ')}]`)
    expect(source).toContain('results.find((result) => result.error)?.error')
    expect(source).toContain('if (firstError) throw new Error(`FINANCE_OPERATIONS_READ_FAILED:${firstError.code}`)')
  })
})
