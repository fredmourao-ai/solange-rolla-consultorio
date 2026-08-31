import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'tests/e2e/**',
      '**/node_modules/**',
      '.worktrees/**',
      '**/node_modules.npm-partial/**',
      '.next/**',
      'backups/**',
    ],
  },
  resolve: {
    alias: {
      'server-only': fileURLToPath(
        new URL('./tests/setup/server-only.ts', import.meta.url),
      ),
    },
  },
})
