import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const API_BASE = 'https://api.supabase.com/v1/projects'

function quoteLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function rowsFromPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.result)) return payload.result
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

export function buildMigrationQuery({ version, name, query }) {
  return [
    'begin;',
    query.trim(),
    'insert into supabase_migrations.schema_migrations (version, statements, name)',
    `values (${quoteLiteral(version)}, array[${quoteLiteral(query)}]::text[], ${quoteLiteral(name)});`,
    'commit;',
  ].join('\n')
}
async function runQuery({ projectRef, accessToken, query, fetchImpl, readOnly = false }) {
  const response = await fetchImpl(`${API_BASE}/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, read_only: readOnly }),
  })

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    throw new Error(`Supabase Management API ${response.status}: ${text || 'empty response'}`)
  }
  return payload
}

async function migrationHistory(options) {
  const payload = await runQuery({
    ...options,
    readOnly: true,
    query: 'select version, name from supabase_migrations.schema_migrations order by version',
  })
  return rowsFromPayload(payload)
}
export async function applyPendingMigrations({ projectRef, accessToken, migrations, fetchImpl = fetch }) {
  const before = await migrationHistory({ projectRef, accessToken, fetchImpl })
  const appliedVersions = new Set(before.map((entry) => entry.version))
  const applied = []

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue
    await runQuery({
      projectRef,
      accessToken,
      fetchImpl,
      query: buildMigrationQuery(migration),
    })
    applied.push(migration.version)
  }

  const after = await migrationHistory({ projectRef, accessToken, fetchImpl })
  const finalVersions = new Set(after.map((entry) => entry.version))
  const missing = migrations.filter((migration) => !finalVersions.has(migration.version))
  if (missing.length > 0) {
    throw new Error(`staging migrations missing after apply: ${missing.map((item) => item.version).join(', ')}`)
  }

  return { applied, total: migrations.length }
}

export function readLocalMigrations(directory = path.resolve('supabase/migrations')) {
  return fs.readdirSync(directory)
    .filter((name) => /^\d{14}_[a-z0-9_]+\.sql$/u.test(name))
    .sort()
    .map((fileName) => {
      const match = fileName.match(/^(\d{14})_(.+)\.sql$/u)
      return {
        version: match[1],
        name: match[2],
        query: fs.readFileSync(path.join(directory, fileName), 'utf8'),
      }
    })
}
async function main() {
  const projectRef = process.env.SUPABASE_STAGING_PROJECT_REF
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  if (!projectRef) throw new Error('SUPABASE_STAGING_PROJECT_REF is required')
  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN is required')

  const migrations = readLocalMigrations()
  const result = await applyPendingMigrations({ projectRef, accessToken, migrations })
  console.log(`staging migrations applied=${result.applied.length} total=${result.total}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
