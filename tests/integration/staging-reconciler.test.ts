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

  it('uses only the current tunnel session and never publishes unverified URLs', () => {
    expect(script).toContain('docker logs --since "$started"')
    expect(script).toContain('public_healthy "$url"')
    expect(script.indexOf('public_healthy "$url"')).toBeLessThan(script.indexOf('mark_url "$url"'))
    expect(script).toContain('Unauthorized: Tunnel not found')
    expect(script).toContain('RENEWED_AT')
  })

  it('executes hostile tunnel fault-injection scenarios in CI', () => {
    const result = spawnSync('python3', [
      '-m', 'unittest', 'tests.test_staging_tunnel_reconciler',
    ], {
      encoding: 'utf8',
      timeout: 120_000,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    })
    expect(result.error, result.stderr || 'Python execution failed').toBeUndefined()
    expect(result.status, result.stderr).toBe(0)
  }, 120_000)
})
