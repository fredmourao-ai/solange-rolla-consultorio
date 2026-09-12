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
      // Mirrors tsconfig.json's "@/*" -> "./src/*" path mapping. Next.js resolves
      // that alias itself at build time, but vitest runs outside Next.js and
      // needs it declared explicitly to import any module under `@/` for real
      // (rather than through a `vi.mock`).
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(
        new URL('./tests/setup/server-only.ts', import.meta.url),
      ),
    },
  },
})
