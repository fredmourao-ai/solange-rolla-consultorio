import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? '3000')
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    navigationTimeout: 180_000,
  },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
