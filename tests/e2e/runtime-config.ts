type E2eEnvironment = Record<string, string | undefined>

type WebServerConfig = {
  command: string
  url: string
  reuseExistingServer: boolean
  timeout: number
}

export function resolveE2eRuntime(env: E2eEnvironment = process.env): {
  baseURL: string
  webServer: WebServerConfig | undefined
} {
  const external = env.E2E_BASE_URL?.trim().replace(/\/+$/, '')
  if (external) return { baseURL: external, webServer: undefined }

  const port = Number(env.E2E_PORT ?? '3000')
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error('E2E_PORT_INVALID')
  const baseURL = `http://127.0.0.1:${port}`
  return {
    baseURL,
    webServer: {
      command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  }
}
