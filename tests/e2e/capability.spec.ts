import { execFileSync } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { expect, test } from './fixtures'

const dbUrl = process.env.DB_URL ?? ''
if (!dbUrl) throw new Error('local Supabase DB_URL is required')
const appointmentId = 'd1000000-0000-4000-8000-000000000003'

function sql(statement: string): string {
  return execFileSync('psql', [dbUrl, '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement], { encoding: 'utf8' }).trim()
}
function quote(value: string): string { return `'${value.replaceAll("'", "''")}'` }

function createCapability(options: { expired?: boolean; revoked?: boolean } = {}) {
  const id = randomUUID()
  const rawToken = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const created = options.expired ? "clock_timestamp()-interval '2 minutes'" : 'clock_timestamp()'
  const expires = options.expired ? "clock_timestamp()-interval '1 minute'" : "clock_timestamp()+interval '30 minutes'"
  const revoked = options.revoked ? 'clock_timestamp()' : 'null'
  sql(`insert into public.capabilities (id,token_hash,purpose,subject_type,subject_id,created_at,expires_at,revoked_at)
       values (${quote(id)},${quote(tokenHash)},'appointment_response','appointment',${quote(appointmentId)},${created},${expires},${revoked})`)
  return { id, rawToken }
}
test('valid capability exchanges once and removes raw token from destination', async ({ page }) => {
  const capability = createCapability()
  const first = await page.request.get(`/c/${capability.rawToken}?purpose=appointment_response`, { maxRedirects: 0 })

  expect(first.status()).toBe(303)
  const location = first.headers().location ?? ''
  expect(location).toContain('/consulta')
  expect(location).not.toContain(capability.rawToken)
  expect(sql(`select (used_at is not null)::text from public.capabilities where id=${quote(capability.id)}`)).toBe('true')

  const replay = await page.request.get(`/c/${capability.rawToken}?purpose=appointment_response`, { maxRedirects: 0 })
  expect(replay.status()).toBe(400)
})

test('expired and revoked capabilities are rejected', async ({ page }) => {
  for (const capability of [createCapability({ expired: true }), createCapability({ revoked: true })]) {
    const response = await page.request.get(`/c/${capability.rawToken}?purpose=appointment_response`, { maxRedirects: 0 })
    expect(response.status()).toBe(400)
  }
})
test('capability cannot be exchanged for a different purpose', async ({ page }) => {
  const capability = createCapability()
  const response = await page.request.get(`/c/${capability.rawToken}?purpose=form_fill`, { maxRedirects: 0 })

  expect(response.status()).toBe(400)
  expect(sql(`select (used_at is null)::text from public.capabilities where id=${quote(capability.id)}`)).toBe('true')
})
