import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const projectRoot = fileURLToPath(new URL('../../', import.meta.url))

describe('brand entry contract', () => {
  it('keeps the login surface inside the Solange Rolla identity', () => {
    const source = readFileSync(path.join(projectRoot, 'src/app/(auth)/login/page.tsx'), 'utf8')
    expect(source).toContain('/brand/solange-rolla-logo.png')
    expect(source).toContain('Gestão do consultório')
    expect(source).toContain('Entre com suas credenciais')
    expect(source).toContain('Entrar no consultório')
  })
})
