type Env = Record<string, string | undefined>

type WebServer = { command: string; url: string; reuseExistingServer: boolean; timeout: number }
export function resolveE2eRuntime(env: Env = process.env): { baseURL: string; webServer: WebServer | undefined } {
  const external = env.E2E_BASE_URL?.trim().replace(/\/+$/, '')
  if (external) {
    const target = env.E2E_TARGET_ENV?.trim().toLowerCase()
    if (target !== 'preview' && target !== 'staging') throw new Error('E2E_EXTERNAL_TARGET_MUST_BE_PREVIEW_OR_STAGING')
    if (env.APP_ENV?.trim().toLowerCase() === 'production') throw new Error('E2E_PRODUCTION_FORBIDDEN')
    return { baseURL: external, webServer: undefined }
  }
  const port = Number(env.E2E_PORT ?? '3000')
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error('E2E_PORT_INVALID')
  const baseURL = `http://127.0.0.1:${port}`
  return { baseURL, webServer: { command: `npm run start -- --hostname 127.0.0.1 --port ${port}`, url: baseURL, reuseExistingServer: false, timeout: 120_000 } }
}
