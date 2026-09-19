import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync('src/app/(protected)/fiscal/operacoes/page.tsx', 'utf8')

describe('fiscal source id browser validation', () => {
  it('uses a UUID pattern that is valid with the browser Unicode v flag', () => {
    expect(source).toContain('pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"')
    expect(source).not.toContain('pattern="[0-9a-fA-F-]{36}"')
  })
})
