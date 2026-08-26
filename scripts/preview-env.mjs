import process from 'node:process'

const required = ['GITHUB_REPOSITORY', 'GITHUB_EVENT_NUMBER', 'VERCEL_URL', 'SUPABASE_PROJECT_REF']
const missing = required.filter((name) => !process.env[name]?.trim())
const productionRef = process.env.SUPABASE_PRODUCTION_PROJECT_REF?.trim()
const stagingRef = process.env.SUPABASE_STAGING_PROJECT_REF?.trim()
const previewRef = process.env.SUPABASE_PROJECT_REF?.trim()

if (process.env.SUPABASE_BRANCHING_ENABLED !== 'true') {
  throw new Error('preview branching is not enabled; this workflow must be skipped')
}
if (missing.length) throw new Error(`preview association is missing: ${missing.join(', ')}`)
if (previewRef === productionRef || previewRef === stagingRef) {
  throw new Error('preview must use a dedicated Supabase preview project or branch')
}
if (process.env.APP_ENV !== 'preview') throw new Error('preview association requires APP_ENV=preview')
if (process.env.WHATSAPP_LIVE_ENABLED === 'true' || process.env.NFSE_LIVE_ENABLED === 'true') {
  throw new Error('preview providers must remain disabled')
}

process.stdout.write(JSON.stringify({
  repository: process.env.GITHUB_REPOSITORY,
  pullRequest: process.env.GITHUB_EVENT_NUMBER,
  vercelPreview: process.env.VERCEL_URL,
  supabasePreviewRef: previewRef,
}) + '\n')
