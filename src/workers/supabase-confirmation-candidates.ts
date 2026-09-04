import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../platform/supabase/types'
import { createServiceRoleSupabaseClient } from '../platform/supabase/service-role'
import type { ConfirmationCandidate } from './appointment-confirmation-scheduling'
import type { ConfirmationRecipient } from '../modules/automations/public'

const ELIGIBLE_STATUSES = ['scheduled', 'rescheduled']
const PREFERRED_CHANNELS: readonly ConfirmationRecipient['preferredChannel'][] = ['whatsapp', 'email', 'phone', 'none']

function toPreferredChannel(value: string | undefined): ConfirmationRecipient['preferredChannel'] {
  return (PREFERRED_CHANNELS as readonly string[]).includes(value ?? '')
    ? (value as ConfirmationRecipient['preferredChannel'])
    : 'none'
}

/**
 * Widened to a 22-26h lookahead so the exact 23-25h eligibility check in
 * scheduleAppointmentConfirmations (the single source of truth for that
 * window) always sees every real candidate, with slack for clock/poll drift.
 */
export async function loadConfirmationCandidates(
  now: Date,
  client: SupabaseClient<Database> = createServiceRoleSupabaseClient(),
): Promise<ConfirmationCandidate[]> {
  const from = new Date(now.getTime() + 22 * 3_600_000)
  const to = new Date(now.getTime() + 26 * 3_600_000)

  const { data, error } = await client
    .from('appointments')
    .select('id,starts_at,status,person:people!appointments_person_id_fkey(preferred_name,civil_name,phone_e164,email_normalized,preferred_channel)')
    .in('status', ELIGIBLE_STATUSES)
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString())

  if (error) throw new Error(`CONFIRMATION_CANDIDATES_READ_FAILED:${error.code}`)

  return (data ?? []).map((row): ConfirmationCandidate => {
    const person: ConfirmationRecipient = {
      preferredName: row.person?.preferred_name || row.person?.civil_name || '',
      phoneE164: row.person?.phone_e164 ?? null,
      emailNormalized: row.person?.email_normalized ?? null,
      preferredChannel: toPreferredChannel(row.person?.preferred_channel),
    }
    return {
      id: row.id,
      startsAt: new Date(row.starts_at),
      startsAtKey: row.starts_at,
      status: row.status,
      person,
    }
  })
}
