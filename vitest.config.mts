import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'server-only': fileURLToPath(
        new URL('./tests/setup/server-only.ts', import.meta.url),
      ),
    },
  },
})
