import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const script = readFileSync('ops/staging/reconcile-demo.sh', 'utf8')

describe('staging demo reconciler', () => {
  it('updates only the public app URL when the quick tunnel changes', () => {
    expect(script).toContain('APP_URL=')
    expect(script).not.toContain('NEXT_PUBLIC_SUPABASE_URL=.*$url')
  })

  it('restarts the web process without rebuilding the deployed SHA', () => {
    expect(script).toContain('docker restart solange-client-demo-web')
    expect(script).not.toContain('npm run build')
  })

  it('keeps strict TLS and avoids unsupported BusyBox wget flags', () => {
    expect(script).toContain('rejectUnauthorized: true')
    expect(script).not.toContain('--tries=1')
  })

  it('runs fail-closed public tunnel regression tests as part of CI', () => {
    const result = spawnSync('python3', ['-m', 'unittest', 'tests.test_staging_reconcile_public_health'], {
      encoding: 'utf8',
      timeout: 120_000,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    })
    expect(result.error, result.stderr || 'python3 execution failed').toBeUndefined()
    expect(result.status, [result.stdout, result.stderr].join('\n')).toBe(0)
  }, 120_000)
})
