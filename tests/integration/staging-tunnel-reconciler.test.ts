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
  '        printf "%s\\n" "$TEST_CURRENT_LOG"',
  '      else',
  '        printf "%s\\n" "$TEST_HISTORIC_LOG"',
  '      fi ;;',
  '    restart) printf "%s\\n" "$*" >> "$TEST_RESTART_LOG" ;;',
  '    *) return 1 ;;',
  '  esac',
  '}',
  'getent() { [ "$TEST_DNS_RESOLVES" = yes ]; }',
].join('\n')

type Scenario = { running?: boolean; dns?: boolean; action?: 'current_tunnel_url' | 'reconcile_url' }
function exercise({ running = true, dns = true, action = 'reconcile_url' }: Scenario = {}) {
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
  it('switches to a resolvable current URL and restarts the web once', () => {
    const result = exercise()
    expect(result.env).toBe('APP_URL=' + liveUrl + '\n')
    expect(result.state).toBe(liveUrl + '\n')
    expect(result.restarts).toBe('restart solange-client-demo-web\n')
  })
})
