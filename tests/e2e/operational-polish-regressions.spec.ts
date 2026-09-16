import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { signInDemo } from './demo-auth'
import { runSql } from './db-command'

const dbUrl = process.env.DB_URL ?? ''
if (!dbUrl) throw new Error('local Supabase DB_URL is required')

function sql(statement: string) { return runSql(statement, dbUrl) }
function q(value: string) { return `'${value.replaceAll("'", "''")}'` }

test('mobile primary navigation closes after route change', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInDemo(page)
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  const navigation = page.locator('#mobile-navigation')
  await expect(navigation).toBeVisible()
  await navigation.getByRole('link', { name: 'Relatórios', exact: true }).click()
  await expect(page).toHaveURL(/\/relatorios$/)
  await expect(navigation).toHaveCount(0)
})

test('event operational statuses are localized', async ({ page }) => {
  await signInDemo(page)
  const eventId = sql('select id from public.events order by created_at limit 1')
  const originalStatus = sql(`select status from public.events where id=${q(eventId)}`)
  const labels = { planned: 'Planejado', open: 'Aberto', full: 'Lotado', completed: 'Concluído', cancelled: 'Cancelado' } as const
  try {
    for (const [status, label] of Object.entries(labels)) {
      sql(`update public.events set status=${q(status)} where id=${q(eventId)}`)
      await page.goto('/eventos/operacoes', { waitUntil: 'domcontentloaded' })
      const card = page.locator('article').filter({ has: page.locator(`input[name="event_id"][value="${eventId}"]`) })
      await expect(card.locator('.operational-status')).toHaveText(label)
    }
  } finally {
    sql(`update public.events set status=${q(originalStatus)} where id=${q(eventId)}`)
  }
})

test('fiscal operational statuses use the canonical Portuguese labels', async ({ page }) => {
  await signInDemo(page)
  const personId = sql('select id from public.people order by created_at limit 1')
  const [profileId, profileVersion] = sql('select id::text||\'|\'||version::text from public.fiscal_profiles order by version desc limit 1').split('|')
  const [treatmentId, treatmentVersion] = sql("select id::text||'|'||version::text from public.fiscal_treatments where source_kind='appointment_completed' order by version desc limit 1").split('|')
  const labels = { not_ready: 'Tratamento fiscal pendente', ready: 'Pronto para revisão', queued: 'Aguardando emissão', processing: 'Emitindo', issued: 'Documento emitido', failed_retryable: 'Erro temporário', failed_final: 'Erro requer ação', cancel_requested: 'Cancelamento solicitado', cancelled: 'Documento cancelado', replaced: 'Documento substituído' } as const

  for (const [status, label] of Object.entries(labels)) {
    const docId = randomUUID()
    const provider = `e2e-status-${status}-${docId.slice(0, 8)}`
    try {
      sql(`insert into public.fiscal_documents(id,source_type,source_id,person_id,payer_person_id,amount_cents,profile_id,profile_version,treatment_id,treatment_version,provider,idempotency_key,status) values (${q(docId)},'appointment_completed',${q(randomUUID())},${q(personId)},${q(personId)},12345,${q(profileId)},${profileVersion},${q(treatmentId)},${treatmentVersion},${q(provider)},${q(`e2e:fiscal-status:${docId}`)},${q(status)})`)
      await page.goto('/fiscal/operacoes', { waitUntil: 'domcontentloaded' })
      const card = page.locator('article').filter({ hasText: `Provedor: ${provider}` })
      await expect(card.locator('.operational-status')).toHaveText(label)
    } finally {
      sql(`delete from public.fiscal_documents where id=${q(docId)}`)
    }
  }
})

test('refunded and voided receivables use Portuguese status labels', async ({ page }) => {
  await signInDemo(page)
  const receivableId = sql('select id from public.receivables order by created_at limit 1')
  const originalStatus = sql(`select status from public.receivables where id=${q(receivableId)}`)
  try {
    for (const [status, label] of [['refunded', 'Reembolsado'], ['voided', 'Cancelado']] as const) {
      sql(`update public.receivables set status=${q(status)} where id=${q(receivableId)}`)
      await page.goto('/financeiro/operacoes', { waitUntil: 'domcontentloaded' })
      const card = page.locator('article').filter({ has: page.locator(`input[name="receivable_id"][value="${receivableId}"]`) })
      await expect(card.locator('.operational-status')).toHaveText(label)
    }
  } finally {
    sql(`update public.receivables set status=${q(originalStatus)} where id=${q(receivableId)}`)
  }
})
