import { afterEach, describe, expect, it } from 'vitest'
import { runSql } from '../e2e/db-command'

describe('staging management API db command', () => {
  const previousMode = process.env.E2E_DB_MODE
  const previousRef = process.env.SUPABASE_STAGING_PROJECT_REF
  const previousToken = process.env.SUPABASE_ACCESS_TOKEN
  const previousSuite = process.env.E2E_EXTERNAL_SUITE

  afterEach(() => {
    if (previousMode === undefined) delete process.env.E2E_DB_MODE
    else process.env.E2E_DB_MODE = previousMode
    if (previousRef === undefined) delete process.env.SUPABASE_STAGING_PROJECT_REF
    else process.env.SUPABASE_STAGING_PROJECT_REF = previousRef
    if (previousToken === undefined) delete process.env.SUPABASE_ACCESS_TOKEN
    else process.env.SUPABASE_ACCESS_TOKEN = previousToken
    if (previousSuite === undefined) delete process.env.E2E_EXTERNAL_SUITE
    else process.env.E2E_EXTERNAL_SUITE = previousSuite
  })

  function captureReadOnly(statement = "select 1") {
    let capturedEnv: NodeJS.ProcessEnv | undefined
    const executor = (_file: string, _args: string[], options: { env: NodeJS.ProcessEnv }) => {
      capturedEnv = options.env
      return ''
    }
    runSql(statement, '', executor as never)
    return capturedEnv?.SUPABASE_STAGING_QUERY_READ_ONLY
  }

  it('marks historical-audit fixture SQL as writable', () => {
    process.env.E2E_DB_MODE = 'supabase-management-api'
    process.env.SUPABASE_STAGING_PROJECT_REF = 'staging-ref'
    process.env.SUPABASE_ACCESS_TOKEN = 'token'
    process.env.E2E_EXTERNAL_SUITE = 'historical-state-audit'

    expect(captureReadOnly("insert into public.appointments (id) values ('fixture')")).toBe('false')
  })

  it('marks full runtime parity fixture SQL as writable', () => {
    process.env.E2E_DB_MODE = 'supabase-management-api'
    process.env.SUPABASE_STAGING_PROJECT_REF = 'staging-ref'
    process.env.SUPABASE_ACCESS_TOKEN = 'token'
    process.env.E2E_EXTERNAL_SUITE = 'full-runtime-parity'

    expect(captureReadOnly("insert into public.appointments (id) values ('fixture')")).toBe('false')
  })

  it('keeps ordinary staging management queries read-only', () => {
    process.env.E2E_DB_MODE = 'supabase-management-api'
    process.env.SUPABASE_STAGING_PROJECT_REF = 'staging-ref'
    process.env.SUPABASE_ACCESS_TOKEN = 'token'
    delete process.env.E2E_EXTERNAL_SUITE

    expect(captureReadOnly()).toBe('true')
  })
})
