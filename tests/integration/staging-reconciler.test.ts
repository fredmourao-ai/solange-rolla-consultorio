import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const script = readFileSync('ops/staging/reconcile-demo.sh', 'utf8')

describe('staging demo reconciler', () => {
  it('keeps public exposure fail-closed unless the release explicitly enables it', () => {
    expect(script).toContain('PUBLIC_EXPOSURE_FILE=/state/public-exposure-enabled')
    expect(script).toContain('public_exposure_enabled')
    expect(script).toContain('docker stop solange-demo-tunnel')
  })

  it('updates only the public app URL when the quick tunnel changes', () => {
    expect(script).toContain('APP_URL=')
    expect(script).not.toContain('NEXT_PUBLIC_SUPABASE_URL=.*$url')
  })

  it('restarts the web process without rebuilding the deployed SHA', () => {
    expect(script).toContain('docker restart solange-client-demo-web')
    expect(script).not.toContain('npm run build')
  })
})
