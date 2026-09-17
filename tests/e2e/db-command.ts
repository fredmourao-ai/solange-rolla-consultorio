import { execFileSync } from 'node:child_process'

type ExecOptions = { encoding: 'utf8'; env: NodeJS.ProcessEnv; timeout: number; killSignal: NodeJS.Signals; input?: string }
type SqlExecutor = (file: string, args: string[], options: ExecOptions) => string

function connectionEnv(dbUrl: string): NodeJS.ProcessEnv {
  const parsed = new URL(dbUrl)
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('DB_URL_INVALID')
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''))
  if (!parsed.hostname || !database || !parsed.username) throw new Error('DB_URL_INVALID')
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || '5432',
    PGDATABASE: database,
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGCONNECT_TIMEOUT: '5',
    PGOPTIONS: '-c statement_timeout=10000 -c lock_timeout=5000',
  }
  const sslmode = parsed.searchParams.get('sslmode')
  if (sslmode) env.PGSSLMODE = sslmode
  return env
}

export function runSql(statement: string, dbUrl: string, executor: SqlExecutor = (file, args, options) => execFileSync(file, args, options)) {
  try {
    if (process.env.E2E_DB_MODE === 'supabase-management-api') {
      const projectRef = process.env.SUPABASE_STAGING_PROJECT_REF?.trim()
      const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim()
      if (!projectRef || !accessToken) throw new Error('STAGING_MANAGEMENT_API_ENV_REQUIRED')
      const historicalAudit = process.env.E2E_EXTERNAL_SUITE === 'historical-state-audit'
      return executor(process.execPath, ['scripts/query-staging-project-cli.mjs'], {
        encoding: 'utf8',
        env: { ...process.env, SUPABASE_STAGING_QUERY_READ_ONLY: historicalAudit ? 'false' : 'true' },
        timeout: 15_000,
        killSignal: 'SIGKILL',
        input: statement,
      }).trim()
    }
    return executor('psql', ['-At', '-v', 'ON_ERROR_STOP=1', '-c', statement], { encoding: 'utf8', env: connectionEnv(dbUrl), timeout: 15_000, killSignal: 'SIGKILL' }).trim()
  } catch {
    throw new Error('PSQL_COMMAND_FAILED')
  }
}
