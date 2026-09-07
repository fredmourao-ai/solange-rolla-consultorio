import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const pages = [
  'src/app/(protected)/agenda/page.tsx',
  'src/app/(protected)/pessoas/page.tsx',
  'src/app/(protected)/eventos/page.tsx',
  'src/app/(protected)/financeiro/page.tsx',
  'src/app/(protected)/fiscal/page.tsx',
  'src/app/(protected)/relatorios/page.tsx',
]

function pageBody(path: string) {
  const source = readFileSync(join(process.cwd(), path), 'utf8')
  return source.slice(source.indexOf('export default async function'))
}

describe('protected page authentication order', () => {
  for (const path of pages) it(`${path} authenticates before starting data reads`, () => {
    const body = pageBody(path)
    const auth = body.indexOf('await getStaffSession()')
    const redirect = body.indexOf("redirect('/login')")
    const client = body.indexOf('await createServerSupabaseClient()')
    expect(auth).toBeGreaterThanOrEqual(0)
    expect(redirect).toBeGreaterThan(auth)
    expect(client).toBeGreaterThan(redirect)
  })
})