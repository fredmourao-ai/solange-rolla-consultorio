import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> }
const script = readFileSync('scripts/run-next-build.sh', 'utf8')

describe('production build gate', () => {
  it('rejects Next.js concurrent-build false greens and stale artifacts', () => {
    expect(pkg.scripts?.build).toBe('bash scripts/run-next-build.sh')
    expect(script).not.toContain('git rev-parse --show-toplevel')
    expect(script).toContain('BASH_SOURCE[0]')
    expect(script).toContain('Another next build process is already running.')
    expect(script).toContain("[ -s .next/BUILD_ID ]")
    expect(script).toContain('BUILD_MTIME')
    expect(script).toContain('Compiled successfully')
    expect(script).toContain('Route (app)')
    expect(script).toContain('PIPESTATUS[0]')
  })
})
