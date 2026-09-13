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
      // Mirrors tsconfig.json's "@/*" -> "./src/*" path mapping. Without an
      // explicit alias here, "@/..." imports only resolve by accident, via
      // Vite's own tsconfig auto-detection in the plain module graph — and
      // that detection is bypassed once a test file uses vi.mock, which
      // switches unmocked imports to a resolver that doesn't know about it.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
