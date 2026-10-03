import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

export const STAGING_DEMO_USER_ID = 'd9000000-0000-4000-8000-000000000001'
export const STAGING_DEMO_EMAIL = 'demo.owner@solange.invalid'
export const LEGACY_DEMO_PASSWORD = 'DemoLocalOnly!2026'

export function validateStagingDemoCredentialConfig({
  stagingRef,
  productionRef,
  url,
  publishableKey,
  secretKey,
  password,
}) {
  if (!stagingRef) throw new Error('SUPABASE_STAGING_PROJECT_REF_REQUIRED')
  if (!productionRef) throw new Error('SUPABASE_PRODUCTION_PROJECT_REF_REQUIRED')
  if (stagingRef === productionRef) throw new Error('STAGING_AUTH_PRODUCTION_FORBIDDEN')
  if (!url || !publishableKey || !secretKey) throw new Error('STAGING_AUTH_CLIENT_CONFIG_REQUIRED')
  if (typeof password !== 'string' || password.length < 32) throw new Error('STAGING_DEMO_PASSWORD_TOO_SHORT')
  if (password === LEGACY_DEMO_PASSWORD) throw new Error('STAGING_DEMO_PASSWORD_MUST_ROTATE_LEGACY')
  const hostname = new URL(url).hostname
  if (!hostname.startsWith(`${stagingRef}.`)) throw new Error('STAGING_AUTH_PROJECT_REF_MISMATCH')
}

export async function rotateAndVerifyStagingDemoCredential({
  stagingRef,
  productionRef,
  url,
  publishableKey,
  secretKey,
  password,
  createClientImpl = createClient,
}) {
  validateStagingDemoCredentialConfig({ stagingRef, productionRef, url, publishableKey, secretKey, password })

  const admin = createClientImpl(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const current = await admin.auth.admin.getUserById(STAGING_DEMO_USER_ID)
  if (current.error || !current.data?.user) throw new Error('STAGING_DEMO_USER_NOT_FOUND')
  if (current.data.user.email !== STAGING_DEMO_EMAIL) throw new Error('STAGING_DEMO_USER_IDENTITY_MISMATCH')

  const updated = await admin.auth.admin.updateUserById(STAGING_DEMO_USER_ID, { password })
  if (updated.error) throw new Error('STAGING_DEMO_PASSWORD_ROTATION_FAILED')

  const publicClient = createClientImpl(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const fresh = await publicClient.auth.signInWithPassword({ email: STAGING_DEMO_EMAIL, password })
  if (fresh.error || fresh.data?.user?.id !== STAGING_DEMO_USER_ID) {
    throw new Error('STAGING_DEMO_NEW_PASSWORD_VERIFICATION_FAILED')
  }
  await publicClient.auth.signOut()

  const legacy = await publicClient.auth.signInWithPassword({
    email: STAGING_DEMO_EMAIL,
    password: LEGACY_DEMO_PASSWORD,
  })
  if (!legacy.error) {
    await publicClient.auth.signOut()
    throw new Error('STAGING_DEMO_LEGACY_PASSWORD_STILL_VALID')
  }

  return { userId: STAGING_DEMO_USER_ID, email: STAGING_DEMO_EMAIL }
}

async function main() {
  await rotateAndVerifyStagingDemoCredential({
    stagingRef: process.env.SUPABASE_STAGING_PROJECT_REF,
    productionRef: process.env.SUPABASE_PRODUCTION_PROJECT_REF,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    secretKey: process.env.SUPABASE_SECRET_KEY,
    password: process.env.STAGING_DEMO_PASSWORD,
  })
  process.stdout.write('staging_demo_credential_rotated_and_verified\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`)
    process.exitCode = 1
  })
}
