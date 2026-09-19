type Env = Record<string, string | undefined>

type WebServer = { command: string; url: string; reuseExistingServer: boolean; timeout: number }
type E2eRuntime = { baseURL: string; webServer: WebServer | undefined; projectTestMatch: string | undefined; expectedBuildSha: string | undefined }

const EXTERNAL_HEALTH_TIMEOUT_MS = 10_000
function normalizedUrl(value: string | undefined): string { return value?.trim().replace(/\/+$/, '') ?? '' }

export function resolveE2eRuntime(env: Env = process.env): E2eRuntime {
  const external = normalizedUrl(env.E2E_BASE_URL)
  if (external) {
    const target = env.E2E_TARGET_ENV?.trim().toLowerCase()
    if (target !== 'preview' && target !== 'staging') throw new Error('E2E_EXTERNAL_TARGET_MUST_BE_PREVIEW_OR_STAGING')
    const appEnv = env.APP_ENV?.trim().toLowerCase()
    if (appEnv === 'production') throw new Error('E2E_PRODUCTION_FORBIDDEN')
    if (appEnv !== target) throw new Error('E2E_EXTERNAL_APP_ENV_MISMATCH')
    const allowedBase = normalizedUrl(env.E2E_ALLOWED_BASE_URL)
    if (!allowedBase || external !== allowedBase) throw new Error('E2E_EXTERNAL_APP_NOT_ALLOWLISTED')
    const dbMode = env.E2E_DB_MODE?.trim() ?? ''
    if (dbMode === 'supabase-management-api') {
      const projectRef = env.SUPABASE_PROJECT_REF?.trim() ?? ''
      const stagingRef = env.SUPABASE_STAGING_PROJECT_REF?.trim() ?? ''
      if (target !== 'staging' || !projectRef || projectRef !== stagingRef) throw new Error('E2E_EXTERNAL_DATABASE_NOT_ALLOWLISTED')
      if (!env.SUPABASE_ACCESS_TOKEN?.trim()) throw new Error('E2E_STAGING_MANAGEMENT_TOKEN_REQUIRED')
    } else {
      const dbUrl = env.DB_URL?.trim() ?? ''
      const allowedDbUrl = env.E2E_ALLOWED_DB_URL?.trim() ?? ''
      if (!dbUrl || !allowedDbUrl || dbUrl !== allowedDbUrl) throw new Error('E2E_EXTERNAL_DATABASE_NOT_ALLOWLISTED')
    }
    const expectedBuildSha = env.E2E_EXPECTED_BUILD_SHA?.trim() ?? ''
    if (!/^[0-9a-f]{40}$/i.test(expectedBuildSha)) throw new Error('E2E_EXPECTED_BUILD_SHA_REQUIRED')
    const externalSuite = env.E2E_EXTERNAL_SUITE?.trim() || 'real-ui-homologation'
    const projectTestMatch = externalSuite === 'real-ui-homologation'
      ? '**/real-ui-homologation.spec.ts'
      : externalSuite === 'historical-state-audit' && target === 'staging'
        ? '**/agenda-historical-state-transitions.spec.ts'
        : externalSuite === 'full-runtime-parity' && target === 'staging'
          ? '**/*.spec.ts'
          : undefined
    if (!projectTestMatch) throw new Error('E2E_EXTERNAL_SUITE_INVALID')
    return { baseURL: external, webServer: undefined, projectTestMatch, expectedBuildSha }
  }
  const port = Number(env.E2E_PORT ?? '3000')
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error('E2E_PORT_INVALID')
  const baseURL = `http://127.0.0.1:${port}`
  const reuseExistingServer = env.E2E_REUSE_EXISTING_SERVER?.trim().toLowerCase() === 'true'
  return { baseURL, webServer: { command: `npm run start -- --hostname 127.0.0.1 --port ${port}`, url: baseURL, reuseExistingServer, timeout: 120_000 }, projectTestMatch: undefined, expectedBuildSha: undefined }
}

export async function assertExternalBuild(runtime: E2eRuntime, fetcher: typeof fetch = fetch): Promise<void> {
  if (!runtime.expectedBuildSha) return
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), EXTERNAL_HEALTH_TIMEOUT_MS)
  try {
    const response = await fetcher(`${runtime.baseURL}/api/health`, { cache: 'no-store', signal: controller.signal })
    if (!response.ok) throw new Error('E2E_HEALTH_CHECK_FAILED')
    const payload = await response.json() as { buildSha?: string }
    if (payload.buildSha !== runtime.expectedBuildSha) throw new Error('E2E_DEPLOYED_SHA_MISMATCH')
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError'))) throw new Error('E2E_HEALTH_CHECK_TIMEOUT')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
