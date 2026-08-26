import process from 'node:process'

const commit = process.env.STAGING_COMMIT_SHA?.trim()
const approved = process.env.STAGING_PROMOTION_APPROVED === 'true'
const productionRef = process.env.SUPABASE_PRODUCTION_PROJECT_REF?.trim()
const stagingRef = process.env.SUPABASE_STAGING_PROJECT_REF?.trim()

if (!/^[0-9a-f]{40}$/i.test(commit ?? '')) {
  throw new Error('STAGING_COMMIT_SHA must be a full 40-character commit SHA')
}
if (!approved) throw new Error('staging promotion requires STAGING_PROMOTION_APPROVED=true')
if (!stagingRef || !productionRef || stagingRef === productionRef) {
  throw new Error('staging and production project references must be distinct')
}
if (process.env.APP_ENV !== 'staging') throw new Error('staging promotion requires APP_ENV=staging')
if (process.env.WHATSAPP_LIVE_ENABLED === 'true' || process.env.NFSE_LIVE_ENABLED === 'true') {
  throw new Error('staging providers must remain disabled')
}

process.stdout.write(`staging promotion authorized for ${commit}\n`)
