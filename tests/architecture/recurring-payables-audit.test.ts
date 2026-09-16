import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('recurring payable audit contract', () => {
  it('uses an atomic database routine instead of inserting payables directly', () => {
    const worker = readFileSync(path.join(process.cwd(), 'scripts/recurring-payables-worker.ts'), 'utf8')
    expect(worker).toContain("client.rpc('create_recurring_payable_atomic'")
    expect(worker).not.toContain("client.from('payables').insert(")
  })

  it('models system audit actors without allowing them to masquerade as users', () => {
    const dir = path.join(process.cwd(), 'supabase/migrations')
    const sql = readdirSync(dir).filter((name) => name.endsWith('.sql'))
      .map((name) => readFileSync(path.join(dir, name), 'utf8')).join('\n')
    expect(sql).toContain("add column actor_kind text not null default 'user'")
    expect(sql).toContain('alter column actor_user_id drop not null')
    expect(sql).toContain("actor_kind = 'system' and actor_user_id is null")
  })

  it('records a sanitized system audit event in the same database routine', () => {
    const dir = path.join(process.cwd(), 'supabase/migrations')
    const sql = readdirSync(dir).filter((name) => name.endsWith('.sql'))
      .map((name) => readFileSync(path.join(dir, name), 'utf8')).join('\n')
    const routine = sql.split('create or replace function public.create_recurring_payable_atomic')[1] ?? ''
    expect(routine).toContain("'payable.recurrence_created'")
    expect(routine).toContain("'system'")
    expect(routine).toContain("'source', 'recurrence'")
    expect(routine).not.toContain("'description', p_description")
  })
})
