import { defineConfig, devices } from '@playwright/test'
import { assertExternalBuild, resolveE2eRuntime } from './tests/e2e/runtime-config'

const runtime = resolveE2eRuntime()
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  globalSetup: runtime.expectedBuildSha ? async () => { await assertExternalBuild(runtime) } : undefined,
  use: { baseURL: runtime.baseURL, trace: 'retain-on-failure', navigationTimeout: 180_000 },
  webServer: runtime.webServer,
  projects: [{ name: 'chromium', testMatch: runtime.projectTestMatch, use: { ...devices['Desktop Chrome'] } }],
})
