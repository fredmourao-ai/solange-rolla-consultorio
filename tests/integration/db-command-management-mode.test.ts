import { afterEach, describe, expect, it } from 'vitest'
import { runSql } from '../e2e/db-command'

describe('staging management API db command', () => {
  const previousMode = process.env.E2E_DB_MODE
  const previousRef = process.env.SUPABASE_STAGING_PROJECT_REF
  const previousToken = process.env.SUPABASE_ACCESS_TOKEN

  afterEach(() => {
    if (previousMode === undefined) delete process.env.E2E_DB_MODE
    else process.env.E2E_DB_MODE = previousMode
    if (previousRef === undefined) delete process.env.SUPABASE_STAGING_PROJECT_REF
    else process.env.SUPABASE_STAGING_PROJECT_REF = previousRef
    if (previousToken === undefined) delete process.env.SUPABASE_ACCESS_TOKEN
    else process.env.SUPABASE_ACCESS_TOKEN = previousToken
  })

  it('marks historical-audit SQL as writable when invoking the management API CLI', () => {
    process.env.E2E_DB_MODE = 'supabase-management-api'
    process.env.SUPABASE_STAGING_PROJECT_REF = 'staging-ref'
    process.env.SUPABASE_ACCESS_TOKEN = 'token'

    let capturedEnv: NodeJS.ProcessEnv | undefined
    const executor = (_file: string, _args: string[], options: { env: NodeJS.ProcessEnv }) => {
      capturedEnv = options.env
      return ''
    }

    runSql("insert into public.appointments (id) values ('fixture')", '', executor as never)

    expect(capturedEnv?.SUPABASE_STAGING_QUERY_READ_ONLY).toBe('false')
  })
})
