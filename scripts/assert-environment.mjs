import process from 'node:process'

const environments = new Set(['local', 'preview', 'staging', 'production'])

function isTrue(value) {
  return value?.toLowerCase() === 'true'
}

export function assertEnvironment(env = process.env) {
  const appEnvironment = env.APP_ENV ?? 'local'
  const errors = []

  if (!environments.has(appEnvironment)) {
    errors.push(`APP_ENV must be one of: ${[...environments].join(', ')}`)
  }

  const projectRef = env.SUPABASE_PROJECT_REF?.trim()
  const productionRef = env.SUPABASE_PRODUCTION_PROJECT_REF?.trim()
  const stagingRef = env.SUPABASE_STAGING_PROJECT_REF?.trim()

  if (appEnvironment !== 'local' && !projectRef) {
    errors.push(`${appEnvironment} requires SUPABASE_PROJECT_REF`)
  }
  if (projectRef && productionRef && appEnvironment !== 'production' && projectRef === productionRef) {
    errors.push(`${appEnvironment} must not use the production Supabase project`)
  }
  if (projectRef && stagingRef && appEnvironment === 'production' && projectRef === stagingRef) {
    errors.push('production must not use the staging Supabase project')
  }

  const liveProviderEnabled = isTrue(env.WHATSAPP_LIVE_ENABLED) || isTrue(env.NFSE_LIVE_ENABLED)
  if (appEnvironment === 'preview' || appEnvironment === 'staging') {
    if (liveProviderEnabled) {
      errors.push(`${appEnvironment} live providers must be disabled`)
    }
  }
  if (appEnvironment === 'production' && liveProviderEnabled && env.GO_LIVE_APPROVED !== 'true') {
    errors.push('production live providers require the explicit go-live gate')
  }

  if (errors.length > 0) {
    throw new Error(`environment isolation assertion failed:\n- ${errors.join('\n- ')}`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    assertEnvironment()
    process.stdout.write('environment isolation assertion passed\n')
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}
