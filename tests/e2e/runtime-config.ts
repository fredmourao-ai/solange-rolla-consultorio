type Env = Record<string, string | undefined>

type WebServer = { command: string; url: string; reuseExistingServer: boolean; timeout: number }
type E2eRuntime = { baseURL: string; webServer: WebServer | undefined; projectTestMatch: string | undefined }

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
    const dbUrl = env.DB_URL?.trim() ?? ''
    const allowedDbUrl = env.E2E_ALLOWED_DB_URL?.trim() ?? ''
    if (!dbUrl || !allowedDbUrl || dbUrl !== allowedDbUrl) throw new Error('E2E_EXTERNAL_DATABASE_NOT_ALLOWLISTED')
    return { baseURL: external, webServer: undefined, projectTestMatch: '**/real-ui-homologation.spec.ts' }
  }
  const port = Number(env.E2E_PORT ?? '3000')
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error('E2E_PORT_INVALID')
  const baseURL = `http://127.0.0.1:${port}`
  return { baseURL, webServer: { command: `npm run start -- --hostname 127.0.0.1 --port ${port}`, url: baseURL, reuseExistingServer: false, timeout: 120_000 }, projectTestMatch: undefined }
}
