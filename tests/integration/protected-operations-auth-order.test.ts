import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const pages = [
  'src/app/(protected)/financeiro/operacoes/page.tsx',
  'src/app/(protected)/eventos/operacoes/page.tsx',
]

function pageBody(relativePath: string) {
  const source = readFileSync(join(process.cwd(), relativePath), 'utf8')
  return source.slice(source.indexOf('export default async function'))
}

describe('protected operations authentication order', () => {
  for (const relativePath of pages) it(`${relativePath} authorizes before database reads`, () => {
    const body = pageBody(relativePath)
    const session = body.indexOf('await getStaffSession()')
    const authorization = body.indexOf('authorizeStaffSession(')
    const client = body.indexOf('await createServerSupabaseClient()')
    expect(session).toBeGreaterThanOrEqual(0)
    expect(authorization).toBeGreaterThan(session)
    expect(client).toBeGreaterThan(authorization)
  })
})