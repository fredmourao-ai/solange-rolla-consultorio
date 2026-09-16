import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const files = [
  'src/modules/identity/ui/login-form.tsx',
  'src/shared/ui/session-controls.tsx',
]

describe('internal client navigation', () => {
  it('uses the Next router instead of forcing full page navigation', () => {
    for (const file of files) {
      const source = readFileSync(path.join(process.cwd(), file), 'utf8')
      expect(source, file).not.toContain('window.location.assign(')
      expect(source, file).toContain('useRouter')
    }
  })
})
