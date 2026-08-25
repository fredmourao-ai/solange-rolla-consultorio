import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const eslintBin = fileURLToPath(
  new URL('../../node_modules/eslint/bin/eslint.js', import.meta.url),
)

const fixtureNames = [
  'client-imports-server-env.tsx',
  'client-imports-server-env-relative.tsx',
  'client-reexports-server-env.tsx',
  'client-dynamically-imports-server-env.tsx',
  'domain-imports-supabase.ts',
  'domain-imports-next.ts',
  'domain-imports-ui.ts',
  'domain-imports-provider.ts',
  'client-imports-client-env.tsx',
  'domain-pure.ts',
]

const lintRun = spawnSync(
  process.execPath,
  [
    eslintBin,
    ...fixtureNames.map((name) => `tests/architecture/fixtures/${name}`),
    '--format',
    'json',
  ],
  { encoding: 'utf8' },
)

type LintMessage = { message: string; ruleId: string | null }
type LintResult = { filePath: string; messages: LintMessage[] }

const lintResults = new Map(
  (JSON.parse(lintRun.stdout) as LintResult[]).map((result) => [
    path.basename(result.filePath),
    result.messages,
  ]),
)

function messagesFor(name: string) {
  const messages = lintResults.get(name)
  expect(messages, `${name} was not linted: ${lintRun.stderr}`).toBeDefined()
  return messages ?? []
}

describe('ESLint architecture boundaries', () => {
  it('blocks every server import form in client components', () => {
    for (const name of [
      'client-imports-server-env.tsx',
      'client-imports-server-env-relative.tsx',
      'client-reexports-server-env.tsx',
      'client-dynamically-imports-server-env.tsx',
    ]) {
      expect(messagesFor(name)).toContainEqual(
        expect.objectContaining({
          ruleId: 'architecture-boundaries/no-client-server-import',
          message: 'Server-only modules cannot be imported by client components.',
        }),
      )
    }
  })

  it.each([
    ['domain-imports-supabase.ts', 'Domain modules cannot import Supabase SDKs.'],
    ['domain-imports-next.ts', 'Domain modules cannot import Next.js.'],
    ['domain-imports-ui.ts', 'Domain modules cannot import UI libraries.'],
    ['domain-imports-provider.ts', 'Domain modules cannot import provider SDKs.'],
  ])('blocks forbidden domain dependency in %s', (name, message) => {
    expect(messagesFor(name)).toContainEqual(
      expect.objectContaining({
        ruleId: 'no-restricted-imports',
        message: expect.stringContaining(message),
      }),
    )
  })

  it('allows public environment imports in client components', () => {
    expect(messagesFor('client-imports-client-env.tsx')).toEqual([])
  })

  it('allows pure domain modules', () => {
    expect(messagesFor('domain-pure.ts')).toEqual([])
  })
})
