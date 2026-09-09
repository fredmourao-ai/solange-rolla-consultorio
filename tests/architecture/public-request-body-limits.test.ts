import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '../..')

const formRoutes = [
  'src/app/api/public/consulta/respond/route.ts',
  'src/app/api/public/formulario/draft/route.ts',
  'src/app/api/public/formulario/review/route.ts',
  'src/app/api/public/formulario/sign/route.ts',
  'src/app/api/public/formulario/submit-reviewed/route.ts',
]

describe('public request body limits', () => {
  it('requires every public form route to parse through the bounded helper', () => {
    for (const relative of formRoutes) {
      const source = readFileSync(path.join(root, relative), 'utf8')
      expect(source, relative).toContain('parseBoundedFormData')
      expect(source, relative).not.toContain('request.formData()')
    }
  })

  it('requires webhook verification to receive a bounded request body', () => {
    const source = readFileSync(path.join(root, 'src/app/api/webhooks/messaging/[provider]/route.ts'), 'utf8')
    expect(source).toContain('cloneRequestWithBoundedBody')
  })
})
