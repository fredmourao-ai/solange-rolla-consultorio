import fs from 'node:fs'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { queryStagingProject } from './query-staging-project.mjs'

export async function seedStagingProject({ stagingRef, productionRef, accessToken, seedSql, fetchImpl = fetch }) {
  if (!stagingRef) throw new Error('SUPABASE_STAGING_PROJECT_REF_REQUIRED')
  if (!productionRef) throw new Error('SUPABASE_PRODUCTION_PROJECT_REF_REQUIRED')
  if (stagingRef === productionRef) throw new Error('STAGING_SEED_PRODUCTION_FORBIDDEN')
  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN_REQUIRED')
  if (!seedSql?.trim()) throw new Error('STAGING_SEED_SQL_REQUIRED')
  await queryStagingProject({ projectRef: stagingRef, accessToken, query: seedSql, fetchImpl, readOnly: false })
}

async function main() {
  const seedSql = fs.readFileSync('supabase/seed.sql', 'utf8')
  await seedStagingProject({
    stagingRef: process.env.SUPABASE_STAGING_PROJECT_REF,
    productionRef: process.env.SUPABASE_PRODUCTION_PROJECT_REF,
    accessToken: process.env.SUPABASE_ACCESS_TOKEN,
    seedSql,
  })
  process.stdout.write('synthetic staging fixtures applied\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`)
    process.exitCode = 1
  })
}
