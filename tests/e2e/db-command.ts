import { execFileSync } from 'node:child_process'

type ExecOptions = { encoding: 'utf8'; env: NodeJS.ProcessEnv; timeout: number }
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
    PGCONNECT_TIMEOUT: '8',
    PGOPTIONS: '-c statement_timeout=8000 -c lock_timeout=4000',
  }
  const sslmode = parsed.searchParams.get('sslmode')
  if (sslmode) env.PGSSLMODE = sslmode
  return env
}

export function runSql(statement: string, dbUrl: string, executor: SqlExecutor = (file, args, options) => execFileSync(file, args, options)) {
  try {
    return executor('psql', ['-At', '-v', 'ON_ERROR_STOP=1', '-c', statement], { encoding: 'utf8', env: connectionEnv(dbUrl), timeout: 20_000 }).trim()
  } catch {
    throw new Error('PSQL_COMMAND_FAILED')
  }
}
