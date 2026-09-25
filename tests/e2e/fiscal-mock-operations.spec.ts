import { execFileSync } from 'node:child_process'
import { createHmac, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from './fixtures'
import { signInDemo } from './demo-auth'

const dbUrl = process.env.DB_URL ?? ''
if (!dbUrl) throw new Error('local Supabase DB_URL is required')

function sql(statement: string) {
  return execFileSync('psql', [dbUrl, '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement], { encoding: 'utf8' }).trim()
}

function q(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

async function resetDemoMfa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  const email = process.env.DEMO_LOCAL_EMAIL
  if (!url || !key || !email) throw new Error('E2E_MFA_BOOTSTRAP_ENV_REQUIRED')

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (usersError) throw usersError
  const user = users.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase())
  if (!user) throw new Error('E2E_MFA_DEMO_USER_NOT_FOUND')

  const { data: factors, error: factorsError } = await admin.auth.admin.mfa.listFactors({ userId: user.id })
  if (factorsError) throw factorsError
  for (const factor of factors.factors) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ userId: user.id, id: factor.id })
    if (error) throw error
  }
}

function decodeBase32(secret: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const char of secret.replace(/=+$/g, '').toUpperCase()) {
    const index = alphabet.indexOf(char)
    if (index < 0) throw new Error('E2E_MFA_SECRET_INVALID')
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2))
  }
  return Buffer.from(bytes)
}

function totp(secret: string, at = Date.now()): string {
  const counter = Math.floor(at / 30_000)
  const message = Buffer.alloc(8)
  message.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', decodeBase32(secret)).update(message).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = ((digest[offset] & 0x7f) << 24)
    | (digest[offset + 1] << 16)
    | (digest[offset + 2] << 8)
    | digest[offset + 3]
  return String(binary % 1_000_000).padStart(6, '0')
}

async function elevateToAal2(page: Page) {
  await page.goto('/seguranca?reason=mfa_required&returnTo=%2Ffiscal%2Foperacoes', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Configurar autenticador' }).click()
  const secret = await page.getByLabel('Chave secreta').inputValue()
  expect(secret).not.toBe('')
  await page.getByLabel('Código de 6 dígitos').fill(totp(secret))
  await page.getByRole('button', { name: 'Ativar MFA' }).click()
  await expect(page).toHaveURL(/\/fiscal\/operacoes$/)
}

test('owner issues a synthetic mock NFS-e at AAL1 and cancels only after real MFA elevation', async ({ page }) => {
  await resetDemoMfa()
  const personId = randomUUID()
  const profileId = randomUUID()
  const sourceId = randomUUID()

  sql(`insert into public.people(
    id,civil_name,birth_date,cpf_normalized,preferred_channel,birthday_messages_enabled,fiscal_address
  ) values(
    ${q(personId)},'Tomador Fiscal','1990-01-01','12345678901','none',false,
    '{"street":"Teste","city":"Divinopolis"}'::jsonb
  )`)
  sql(`insert into public.fiscal_profiles(
    id,version,issuer_kind,issuer_document,municipality_code,service_code,tax_regime,
    fiscal_address,effective_from,active
  ) values(
    ${q(profileId)},99,'individual','12345678901','3122306','8650002','pf',
    '{"city":"Divinopolis"}'::jsonb,'2026-01-01',true
  )`)
  const treatmentId = sql(`select id from public.fiscal_treatments
    where source_kind='event_registration' order by version desc limit 1`)

  await signInDemo(page)
  await page.goto('/fiscal/operacoes', { waitUntil: 'domcontentloaded' })

  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Emitir NFS-e mock' }) })
  await form.locator('select[name="source_type"]').selectOption('event_registration')
  await form.locator('input[name="source_id"]').fill(sourceId)
  await form.locator('select[name="person_id"]').selectOption(personId)
  await form.locator('select[name="payer_person_id"]').selectOption(personId)
  await form.locator('input[name="amount"]').fill('250.00')
  await form.locator('select[name="profile_id"]').selectOption(profileId)
  await form.locator('select[name="treatment_id"]').selectOption(treatmentId)
  await form.locator('input[name="review_ack"]').check()
  await form.getByRole('button', { name: 'Emitir NFS-e mock' }).click()

  await expect.poll(
    () => sql(`select id from public.fiscal_documents where source_id=${q(sourceId)} and provider='mock'`),
    { timeout: 15_000 },
  ).not.toBe('')

  const docId = sql(`select id from public.fiscal_documents where source_id=${q(sourceId)} and provider='mock'`)
  await expect.poll(
    () => sql(`select status||'|'||provider||'|'||(xml_path is not null)::text||'|'||(pdf_path is not null)::text
      from public.fiscal_documents where id=${q(docId)}`),
  ).toBe('issued|mock|true|true')
  await expect.poll(
    () => sql(`select count(*) from storage.objects
      where bucket_id='fiscal-documents-private' and name like ${q(`${docId}/%`)}`),
  ).toBe('2')
  await expect.poll(
    () => sql(`select count(*) from public.fiscal_attempts
      where fiscal_document_id=${q(docId)} and operation='issue' and status='succeeded'`),
  ).toBe('1')
  await expect.poll(
    () => sql(`select count(*) from public.audit_events
      where action='fiscal.mock_issued' and entity_id=${q(docId)}`),
  ).toBe('1')

  await expect(
    page.locator('form').filter({ has: page.locator(`input[name="fiscal_document_id"][value="${docId}"]`) }),
  ).toHaveCount(0)

  await elevateToAal2(page)

  const cancel = page.locator('form').filter({
    has: page.locator(`input[name="fiscal_document_id"][value="${docId}"]`),
  })
  await cancel.locator('input[name="reason"]').fill('Cancelamento de homologação')
  await cancel.getByRole('button', { name: 'Cancelar NFS-e mock' }).click()

  await expect.poll(
    () => sql(`select status from public.fiscal_documents where id=${q(docId)}`),
  ).toBe('cancelled')
  await expect.poll(
    () => sql(`select count(*) from public.fiscal_cancellation_events
      where fiscal_document_id=${q(docId)} and status='cancelled'`),
  ).toBe('1')
  await expect.poll(
    () => sql(`select count(*) from public.fiscal_attempts
      where fiscal_document_id=${q(docId)} and operation='cancel' and status='succeeded'`),
  ).toBe('1')
  await expect.poll(
    () => sql(`select count(*) from public.audit_events
      where action='fiscal.mock_cancelled' and entity_id=${q(docId)}`),
  ).toBe('1')
  await expect.poll(
    () => sql(`select count(*) from storage.objects
      where bucket_id='fiscal-documents-private' and name like ${q(`${docId}/%`)}`),
  ).toBe('2')
})
