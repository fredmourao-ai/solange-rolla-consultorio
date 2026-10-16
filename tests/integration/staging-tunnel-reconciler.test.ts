import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const reconciler = readFileSync('ops/staging/reconcile-demo.sh', 'utf8')
const split = reconciler.indexOf('\nwhile :; do\n')
if (split < 0) throw new Error('STAGING_RECONCILER_LOOP_NOT_FOUND')
const functions = reconciler.slice(0, split)

const priorUrl = 'https://baseline-existing.trycloudflare.com'
const staleUrl = 'https://stale-old-tunnel.trycloudflare.com'
const liveUrl = 'https://fresh-new-tunnel.trycloudflare.com'
const tunnelStarted = '2026-10-09T10:00:35.776091088Z'

const fakeRuntime = [
  'APP="$TEST_APP_ROOT"',
  'URL_FILE="$TEST_URL_FILE"',
  'log() { :; }',
  'app_valid() { return 0; }',
  'docker() {',
  '  case "$1" in',
  '    inspect)',
  '      case "$*" in',
  '        *State.Running*) printf "%s\\n" "$TEST_TUNNEL_RUNNING" ;;',
  '        *State.StartedAt*) printf "%s\\n" "$TEST_STARTED" ;;',
  '        *) return 1 ;;',
  '      esac ;;',
  '    logs)',
  '      if [ "$2" = "--since" ] && [ "$3" = "$TEST_STARTED" ]; then',
  '        if [ "$TEST_SINCE_EMPTY" != yes ]; then printf "%s\\n" "$TEST_CURRENT_LOG"; fi',
  '      else',
  '        printf "%s\\n" "$TEST_TIMESTAMPED_LOG"',
  '      fi ;;',
  '    restart) printf "%s\\n" "$*" >> "$TEST_RESTART_LOG" ;;',
  '    *) return 1 ;;',
  '  esac',
  '}',
  'getent() { [ "$TEST_DNS_RESOLVES" = yes ]; }',
  'wget() {',
  '  [ "$TEST_HTTP_HEALTHY" = yes ] || return 1',
  '  printf "  HTTP/1.1 200 OK\n" >&2',
  '  printf \'{"status":"ok","buildSha":"%s"}\' "$TEST_HEALTH_SHA"',
  '}',
  'RELEASE_SHA_FILE="$TEST_RELEASE_SHA_FILE"',
].join('\n')

type Scenario = {
  running?: boolean
  dns?: boolean
  emptySince?: boolean
  publicHealthy?: boolean
  publicShaMatches?: boolean
  recentUrl?: boolean
  action?: 'current_tunnel_url' | 'reconcile_url'
}
const expectedSha = 'a'.repeat(40)
const wrongSha = 'b'.repeat(40)

function exercise({
  running = true,
  dns = true,
  emptySince = false,
  publicHealthy = true,
  publicShaMatches = true,
  recentUrl = true,
  action = 'reconcile_url',
}: Scenario = {}) {
  const root = mkdtempSync(join(tmpdir(), 'solange-staging-tunnel-'))
  try {
    const app = join(root, 'app')
    const state = join(root, 'state')
    mkdirSync(app)
    mkdirSync(state)
    const envPath = join(app, '.env.production.local')
    const urlPath = join(state, 'current-url.txt')
    const restartPath = join(root, 'restarts.txt')
    writeFileSync(envPath, 'APP_URL=' + priorUrl + '\n')
    writeFileSync(urlPath, priorUrl + '\n')
    writeFileSync(restartPath, '')
    const releaseShaPath = join(state, 'deployed-sha.txt')
    writeFileSync(releaseShaPath, expectedSha + '\n')

    const result = spawnSync('sh', ['-c', functions + '\n' + fakeRuntime + '\n' + action], {
      encoding: 'utf8',
      timeout: 5000,
      env: {
        ...process.env,
        TEST_APP_ROOT: app,
        TEST_URL_FILE: urlPath,
        TEST_RESTART_LOG: restartPath,
        TEST_TUNNEL_RUNNING: running ? 'true' : 'false',
        TEST_DNS_RESOLVES: dns ? 'yes' : 'no',
        TEST_STARTED: tunnelStarted,
        TEST_CURRENT_LOG: 'current startup ' + liveUrl,
        TEST_HISTORIC_LOG: 'old run ' + staleUrl,
        TEST_TIMESTAMPED_LOG: [
          '2026-10-08T09:00:00.000000000Z prior run ' + staleUrl,
          '2026-10-09T10:00:35.700000000Z same-second prior ' + staleUrl,
          ...(recentUrl ? ['2026-10-09T10:00:36.000000000Z fresh ' + liveUrl] : []),
        ].join('\n'),
        TEST_SINCE_EMPTY: emptySince ? 'yes' : 'no',
        TEST_HTTP_HEALTHY: publicHealthy ? 'yes' : 'no',
        TEST_HEALTH_SHA: publicShaMatches ? expectedSha : wrongSha,
        TEST_RELEASE_SHA_FILE: releaseShaPath,
      },
    })
    if (result.error) throw result.error
    expect(result.status, result.stderr).toBe(0)
    return {
      stdout: result.stdout,
      env: readFileSync(envPath, 'utf8'),
      state: readFileSync(urlPath, 'utf8'),
      restarts: readFileSync(restartPath, 'utf8'),
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

describe('staging tunnel reconciler fails closed on expired Cloudflare URLs', () => {
  it('uses only the active container lifetime, not stale log lines', () => {
    expect(exercise({ action: 'current_tunnel_url' }).stdout.trim()).toBe(liveUrl)
  })
  it('rejects a stopped tunnel even if old logs contain a URL', () => {
    expect(exercise({ running: false, action: 'current_tunnel_url' }).stdout.trim()).toBe('')
  })
  it('does not publish an unresolved URL or restart the staging web container', () => {
    const result = exercise({ dns: false })
    expect(result.env).toBe('APP_URL=' + priorUrl + '\n')
    expect(result.state).toBe(priorUrl + '\n')
    expect(result.restarts).toBe('')
  })
  it('recovers from silent Docker --since log filtering without using old run URLs', () => {
    const result = exercise({ emptySince: true })
    expect(result.state).toBe(liveUrl + '\n')
    expect(result.env).toBe('APP_URL=' + liveUrl + '\n')
  })
  it('does not read a prior quick-tunnel URL even in the same start second', () => {
    expect(exercise({ action: 'current_tunnel_url', emptySince: true, recentUrl: false }).stdout.trim()).toBe('')
  })
  it('rejects a DNS-resolving but unreachable public health endpoint', () => {
    const result = exercise({ publicHealthy: false })
    expect(result.state).toBe(priorUrl + '\n')
    expect(result.restarts).toBe('')
  })
  it('rejects a public health endpoint serving a different deployment SHA', () => {
    const result = exercise({ publicShaMatches: false })
    expect(result.state).toBe(priorUrl + '\n')
    expect(result.restarts).toBe('')
  })
  it('switches to a resolvable current URL and restarts the web once', () => {
    const result = exercise()
    expect(result.env).toBe('APP_URL=' + liveUrl + '\n')
    expect(result.state).toBe(liveUrl + '\n')
    expect(result.restarts).toBe('restart solange-client-demo-web\n')
  })
})
