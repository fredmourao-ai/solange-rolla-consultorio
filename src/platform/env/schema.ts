import { z } from 'zod'

const explicitBoolean = z.enum(['true', 'false']).transform((value) => value === 'true')

const publicEnvShape = {
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith('sb_publishable_'),
} as const

export const clientEnvSchema = z.object(publicEnvShape)

export const serverEnvSchema = z.object({
  ...publicEnvShape,
  SUPABASE_SECRET_KEY: z.string().startsWith('sb_secret_'),
  APP_URL: z.string().url(),
  APP_ENV: z.enum(['local', 'test', 'preview', 'staging', 'production']),
  CLINICAL_ENCRYPTION_KEY_V1: z.string().min(1),
  CLINICAL_ENCRYPTION_ACTIVE_VERSION: z.string().regex(/^\d+$/),
  WHATSAPP_LIVE_ENABLED: explicitBoolean,
  NFSE_LIVE_ENABLED: explicitBoolean,
})

export type ClientEnv = z.infer<typeof clientEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>

export function parseClientEnv(input: Record<string, string | undefined>): ClientEnv {
  return clientEnvSchema.parse(input)
}

export function parseServerEnv(input: Record<string, string | undefined>): ServerEnv {
  return serverEnvSchema.parse(input)
}
