import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const repositoryRoot = process.cwd()
const checker = path.join(repositoryRoot, 'scripts/check-migrations.mjs')
const fixtureMigrations = path.join(
  repositoryRoot,
  'tests/architecture/migration-fixtures/base/supabase/migrations',
)
const temporaryRepositories: string[] = []

function runGit(repository: string, args: string[]) {
  execFileSync('git', args, {
    cwd: repository,
    stdio: 'pipe',
  })
}

function createRepository() {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-history-'))
  temporaryRepositories.push(repository)

  fs.mkdirSync(path.join(repository, 'supabase'), { recursive: true })
  fs.cpSync(
    fixtureMigrations,
    path.join(repository, 'supabase/migrations'),
    { recursive: true },
  )

  runGit(repository, ['init', '--quiet', '--initial-branch=main'])
  runGit(repository, ['config', 'user.email', 'architecture@example.test'])
  runGit(repository, ['config', 'user.name', 'Architecture Test'])
  runGit(repository, ['add', 'supabase/migrations'])
  runGit(repository, ['commit', '--quiet', '-m', 'base migrations'])
  runGit(repository, ['branch', 'migration-base'])

  return repository
}

function checkMigrations(
  repository: string,
  options?: {
    baseRef?: string
    ci?: boolean
    environment?: Record<string, string>
  },
) {
  const args = [checker]
  if (options?.baseRef) {
    args.push('--base-ref', options.baseRef)
  }

  return spawnSync(process.execPath, args, {
    cwd: repository,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options?.environment,
      ...(options?.ci ? { CI: 'true' } : { CI: '' }),
    },
  })
}

function outputOf(result: ReturnType<typeof checkMigrations>) {
  return `${result.stdout}\n${result.stderr}`
}

afterEach(() => {
  for (const repository of temporaryRepositories.splice(0)) {
    fs.rmSync(repository, { recursive: true, force: true })
  }
})

describe('migration history', () => {
  it('rejects a filename with impossible UTC timestamp components', () => {
    const repository = createRepository()
    fs.writeFileSync(
      path.join(repository, 'supabase/migrations/20260230030000_invalid_date.sql'),
      'select 1;\n',
    )

    const result = checkMigrations(repository, { baseRef: 'migration-base' })

    expect(result.status).not.toBe(0)
    expect(outputOf(result)).toContain(
      '20260230030000_invalid_date.sql: timestamp is not a real UTC date and time',
    )
  })

  it('rejects duplicate timestamp prefixes', () => {
    const repository = createRepository()
    fs.writeFileSync(
      path.join(repository, 'supabase/migrations/20260824000100_another_base.sql'),
      'select 1;\n',
    )

    const result = checkMigrations(repository, { baseRef: 'migration-base' })

    expect(result.status).not.toBe(0)
    expect(outputOf(result)).toContain('duplicate migration timestamp: 20260824000100')
  })

  it('rejects a base migration whose blob changed in the working tree', () => {
    const repository = createRepository()
    fs.appendFileSync(
      path.join(repository, 'supabase/migrations/20260824000100_extensions.sql'),
      '-- modified after application\n',
    )

    const result = checkMigrations(repository, { baseRef: 'migration-base' })

    expect(result.status).not.toBe(0)
    expect(outputOf(result)).toContain(
      'base migration was modified: supabase/migrations/20260824000100_extensions.sql',
    )
  })

  it('rejects a base migration deleted from the working tree', () => {
    const repository = createRepository()
    fs.rmSync(
      path.join(repository, 'supabase/migrations/20260824000200_queues.sql'),
    )

    const result = checkMigrations(repository, { baseRef: 'migration-base' })

    expect(result.status).not.toBe(0)
    expect(outputOf(result)).toContain(
      'base migration was deleted: supabase/migrations/20260824000200_queues.sql',
    )
  })

  it('fails closed in CI when the migration base cannot be resolved', () => {
    const repository = createRepository()

    const result = checkMigrations(repository, {
      baseRef: 'missing-migration-base',
      ci: true,
    })

    expect(result.status).not.toBe(0)
    expect(outputOf(result)).toContain(
      'unable to resolve migration base ref: missing-migration-base',
    )
  })

  it('accepts a valid forward-only migration after unchanged base migrations', () => {
    const repository = createRepository()
    fs.writeFileSync(
      path.join(repository, 'supabase/migrations/20260824000300_add_queue_metrics.sql'),
      'select 1;\n',
    )

    const result = checkMigrations(repository, { baseRef: 'migration-base' })

    expect(result.status, outputOf(result)).toBe(0)
  })

  it('falls back to origin/main when a CI base-ref environment variable is empty', () => {
    const repository = createRepository()
    runGit(repository, ['update-ref', 'refs/remotes/origin/main', 'migration-base'])

    const result = checkMigrations(repository, {
      environment: {
        GITHUB_EVENT_PULL_REQUEST_BASE_SHA: '',
        MIGRATION_BASE_REF: '',
      },
    })

    expect(result.status, outputOf(result)).toBe(0)
  })

  it('exposes immutable migration history as an npm and database CI gate', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> }
    const workflow = fs.readFileSync(
      path.join(repositoryRoot, '.github/workflows/db.yml'),
      'utf8',
    )

    expect(packageJson.scripts['migrations:check']).toBe(
      'node scripts/check-migrations.mjs',
    )
    expect(workflow).toContain('fetch-depth: 0')
    expect(workflow).toContain('name: Migration history')
    expect(workflow).toContain('github.event.before')
    expect(workflow).toContain('run: npm run migrations:check')
    expect(workflow).toContain('npx supabase@2.115.0 db start')
    expect(workflow).toContain('npx supabase@2.115.0 db reset')
    expect(workflow).toContain('npx supabase@2.115.0 test db')
    expect(workflow).toContain('npx supabase@2.115.0 gen types typescript --local')
  })

  it('documents clinical and platform schema ownership boundaries', () => {
    const ownership = fs.readFileSync(
      path.join(repositoryRoot, 'docs/SCHEMA_OWNERSHIP.md'),
      'utf8',
    )

    expect(ownership).toContain('clinical schema is exclusively owned by `clinical`')
    expect(ownership).toContain('cross-module Task Contract')
    expect(ownership).toContain('`public.queue_send`')
    expect(ownership).toContain('`pgmq` schema')
  })
})
