import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'

const dbUrl = process.env.DB_URL ?? ''
if (!dbUrl) throw new Error('local Supabase DB_URL is required')

function sql(statement: string): string {
  return execFileSync('psql', [dbUrl, '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement], { encoding: 'utf8' }).trim()
}

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

const legalKeys = ['service_terms', 'cancellation_policy', 'truthfulness_declaration', 'privacy_notice'] as const

function ensureLegalDocuments() {
  const values = legalKeys.map((key) => `(${quote(key)})`).join(',')
  sql(`insert into public.legal_documents (key) values ${values} on conflict (key) do nothing`)
  for (const key of legalKeys) {
    const content = `Documento sintético de teste: ${key}.`
    const hash = createHash('sha256').update(content).digest('hex')
    sql(`
      insert into public.legal_document_versions
        (document_id, version, content, content_hash_sha256, effective_from, is_draft)
      select d.id, 1, ${quote(content)}, ${quote(hash)}, clock_timestamp() - interval '1 minute', false
      from public.legal_documents d
      where d.key = ${quote(key)}
        and not exists (
          select 1 from public.legal_document_versions v
          where v.document_id = d.id and not v.is_draft and v.effective_from <= clock_timestamp()
        )`)
  }
}
function createScenario() {
  ensureLegalDocuments()
  const personId = randomUUID()
  const templateId = randomUUID()
  const templateVersionId = randomUUID()
  const submissionId = randomUUID()
  const capabilityId = randomUUID()
  const rawToken = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const schema = JSON.stringify({ fields: [
    { key: 'full_name', type: 'short_text', required: true, label: 'Nome completo' },
    { key: 'notes', type: 'long_text', required: true, label: 'O que gostaria de compartilhar?' },
  ] })

  sql(`
    insert into public.people (id, civil_name, birth_date, preferred_channel)
    values (${quote(personId)}, 'Paciente Sintético E2E', '1990-01-01', 'none');
    insert into public.form_templates (id, name, active_version)
    values (${quote(templateId)}, 'Pré-consulta E2E', 1);
    insert into public.form_template_versions (id, template_id, version, data_classification, schema)
    values (${quote(templateVersionId)}, ${quote(templateId)}, 1, 'sensitive', ${quote(schema)}::jsonb);
    insert into public.form_submissions (id, subject_id, template_version_id, status)
    values (${quote(submissionId)}, ${quote(personId)}, ${quote(templateVersionId)}, 'draft');
    insert into public.capabilities (id, token_hash, purpose, subject_type, subject_id, expires_at)
    values (${quote(capabilityId)}, ${quote(tokenHash)}, 'form_fill', 'form_submission', ${quote(submissionId)}, clock_timestamp() + interval '30 minutes')`)

  return { personId, submissionId, capabilityId, rawToken }
}

test('patient completes encrypted intake, reviews, signs, and loses the capability', async ({ page }) => {
  const scenario = await createScenario()

  await page.goto(`/c/${scenario.rawToken}?purpose=form_fill`, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/formulario$/)
  expect(page.url()).not.toContain(scenario.rawToken)

  await page.getByLabel('Nome completo').fill('Paciente Sintético E2E')
  await page.getByLabel('O que gostaria de compartilhar?').fill('Conteúdo clínico sintético para validar criptografia.')
  const reviewResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/public/formulario/review'))
  await page.getByRole('button', { name: 'Revisar respostas' }).click()
  const reviewResponse = await reviewResponsePromise
  expect(reviewResponse.status()).toBe(303)
  expect(reviewResponse.headers()['location']).toBe(`${process.env.APP_URL}/formulario/revisao`)

  await expect(page).toHaveURL(/\/formulario\/revisao$/)
  await expect(page.getByLabel('Nome completo')).toHaveValue('Paciente Sintético E2E')
  await page.getByRole('button', { name: 'Confirmar e continuar' }).click()
  await expect(page).toHaveURL(/\/formulario\/assinar$/)
  const legalCheckboxes = page.getByRole('checkbox')
  await expect(legalCheckboxes).toHaveCount(4)
  for (let index = 0; index < 4; index += 1) await legalCheckboxes.nth(index).check()
  await page.getByLabel('Digite seu nome completo para assinar').fill('Paciente Sintético E2E')
  await page.getByRole('button', { name: 'Confirmar e assinar' }).click()

  await expect(page).toHaveURL(/\/formulario-concluido$/)
  await expect(page.getByRole('heading', { name: 'Formulário enviado e assinado' })).toBeVisible()

  expect(sql(`select status from public.form_submissions where id = ${quote(scenario.submissionId)}`)).toBe('signed')
  const versionRow = sql(`
    select id || '|' || case when answers is null then 'NULL' else answers::text end || '|' || coalesce(answers_ciphertext, '')
    from public.form_submission_versions where submission_id = ${quote(scenario.submissionId)}`)
  const [versionId, plaintextMarker, ciphertext] = versionRow.split('|')
  expect(versionId).toBeTruthy()
  expect(plaintextMarker).toBe('NULL')
  expect(ciphertext.length).toBeGreaterThan(0)

  expect(sql(`select (revoked_at is not null)::text from public.capabilities where id = ${quote(scenario.capabilityId)}`)).toBe('true')
  expect(sql(`select count(*) from public.signature_evidence where submission_version_id = ${quote(versionId)}`)).toBe('1')

  await page.goto('/formulario', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/link-expirado$/)
  const replay = await page.request.get(`/c/${scenario.rawToken}?purpose=form_fill`, { maxRedirects: 0 })
  expect(replay.status()).toBe(400)
})
