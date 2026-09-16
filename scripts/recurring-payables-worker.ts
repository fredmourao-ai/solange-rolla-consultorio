import { writeFile } from 'node:fs/promises'
import { createServiceRoleSupabaseClient } from '../src/platform/supabase/service-role'
import { reconcileRecurringPayables, type ActiveRecurrenceRule, type RecurringPayableRow } from '../src/workers/recurring-payables-scheduling'

function positiveInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function log(event: string, metadata: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ at: new Date().toISOString(), event, ...metadata }))
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true })
  })
}

async function main() {
  const client = createServiceRoleSupabaseClient()
  const controller = new AbortController()
  process.on('SIGTERM', () => controller.abort())
  process.on('SIGINT', () => controller.abort())
  const intervalMs = positiveInt(process.env.RECURRING_PAYABLES_WORKER_INTERVAL_MS, 3_600_000, 60_000, 86_400_000)
  const heartbeatPath = process.env.RECURRING_PAYABLES_WORKER_HEALTH_FILE ?? '/tmp/solange-recurring-payables-worker.heartbeat'

  async function loadRules(): Promise<ActiveRecurrenceRule[]> {
    const { data, error } = await client.from('recurrence_rules')
      .select('id,vendor_id,category_id,description,amount_cents,start_date,day_of_month,month_end_fallback')
      .eq('active', true)
      .order('id')
    if (error) throw new Error(`RECURRING_PAYABLE_RULES_READ_FAILED:${error.code}`)
    return (data ?? []).map((row) => {
      if (row.month_end_fallback !== 'last_day' && row.month_end_fallback !== 'reject') {
        throw new Error('RECURRING_PAYABLE_RULE_POLICY_INVALID')
      }
      return {
      id: row.id,
      vendorId: row.vendor_id,
      categoryId: row.category_id,
      description: row.description,
      amountCents: Number(row.amount_cents),
      startDate: row.start_date,
      dayOfMonth: row.day_of_month,
      monthEndFallback: row.month_end_fallback,
      }
    })
  }

  async function insertIfMissing(row: RecurringPayableRow): Promise<boolean> {
    const { error } = await client.from('payables').insert({
      vendor_id: row.vendorId,
      category_id: row.categoryId,
      recurrence_rule_id: row.recurrenceRuleId,
      description: row.description,
      amount_cents: row.amountCents,
      due_date: row.dueDate,
      competence: row.competence,
      idempotency_key: row.idempotencyKey,
    })
    if (!error) return true
    if (error.code === '23505') return false
    throw new Error(`RECURRING_PAYABLE_CREATE_FAILED:${error.code}`)
  }

  log('recurring_payables_worker_started', { intervalMs })
  while (!controller.signal.aborted) {
    try {
      const rules = await loadRules()
      const result = await reconcileRecurringPayables({ now: new Date(), rules, insertIfMissing })
      await writeFile(heartbeatPath, new Date().toISOString(), { encoding: 'utf8', mode: 0o600 })
      log('recurring_payables_reconciled', result)
    } catch (error) {
      log('recurring_payables_reconcile_failed', { code: error instanceof Error ? error.message.split(':')[0] : 'RECURRING_PAYABLES_TRANSIENT' })
    }
    if (!controller.signal.aborted) await wait(intervalMs, controller.signal)
  }
  log('recurring_payables_worker_stopped')
}

main().catch(() => {
  console.error(JSON.stringify({ at: new Date().toISOString(), event: 'recurring_payables_worker_fatal' }))
  process.exitCode = 1
})
