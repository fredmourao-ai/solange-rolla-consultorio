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

  it('reads bounded quick-tunnel logs from the current container lifetime', () => {
    expect(script).toContain("docker inspect -f '{{.State.StartedAt}}' solange-demo-tunnel")
    expect(script).toContain('docker logs --since "$started" --tail 400 solange-demo-tunnel')
    expect(script).not.toContain('docker logs solange-demo-tunnel 2>&1')
  })

  it('verifies public HTTPS health before publishing a new quick-tunnel URL', () => {
    const guard = script.indexOf('if ! wget -q -T 8 -O /dev/null "$url/api/health"')
    const publish = script.indexOf('> "$URL_FILE"')
    expect(guard).toBeGreaterThan(0)
    expect(publish).toBeGreaterThan(guard)
    expect(script).toContain('marker unchanged')
  })
})
