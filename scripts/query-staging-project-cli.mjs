import process from 'node:process'
import { queryStagingProject, scalarFromRows } from './query-staging-project.mjs'

let query = ''
for await (const chunk of process.stdin) query += chunk
try {
  const rows = await queryStagingProject({
    projectRef: process.env.SUPABASE_STAGING_PROJECT_REF,
    accessToken: process.env.SUPABASE_ACCESS_TOKEN,
    query,
    readOnly: process.env.SUPABASE_STAGING_QUERY_READ_ONLY !== 'false',
  })
  process.stdout.write(`${scalarFromRows(rows)}\n`)
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`)
  process.exitCode = 1
}
