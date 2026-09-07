import { describe, expect, it } from 'vitest'

describe('E2E database command security', () => {
  it('keeps DB credentials out of argv and sanitizes subprocess failures', async () => {
    const mod = await import('../e2e/db-command').catch(() => null) as null | { runSql: (statement: string, dbUrl: string, executor: (...args: unknown[]) => string) => string }
    expect(mod).not.toBeNull()
    if (!mod) return
    const dbUrl = 'postgresql://tester:s3cr3t%21@db.example.test:5432/solange?sslmode=require'
    let commandArgs: string[] = []; let options: { env?: Record<string, string> } = {}
    const executor = (_file: unknown, args: unknown, execOptions: unknown) => { commandArgs = args as string[]; options = execOptions as typeof options; throw new Error(`subprocess leaked ${dbUrl}`) }
    let message = ''
    try { mod.runSql('select 1', dbUrl, executor) } catch (error) { message = error instanceof Error ? error.message : String(error) }
    expect(message).toBe('PSQL_COMMAND_FAILED')
    expect(JSON.stringify(commandArgs)).not.toContain(dbUrl)
    expect(JSON.stringify(commandArgs)).not.toContain('s3cr3t')
    expect(options.env?.PGHOST).toBe('db.example.test')
    expect(options.env?.PGPORT).toBe('5432')
    expect(options.env?.PGDATABASE).toBe('solange')
    expect(options.env?.PGUSER).toBe('tester')
    expect(options.env?.PGPASSWORD).toBe('s3cr3t!')
    expect(options.env?.PGSSLMODE).toBe('require')
  })
})
