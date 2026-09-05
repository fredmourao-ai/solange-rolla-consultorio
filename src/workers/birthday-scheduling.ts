import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../platform/supabase/types'
import { createServiceRoleSupabaseClient } from '../platform/supabase/service-role'
import { sendBirthdayGreetings, type BirthdayPerson, type BirthdayMessage } from '../modules/automations/public'

export async function loadBirthdayCandidates(
  client: SupabaseClient<Database> = createServiceRoleSupabaseClient(),
): Promise<BirthdayPerson[]> {
  const { data, error } = await client
    .from('people')
    .select('id,preferred_name,civil_name,birth_date,birthday_messages_enabled,preferred_channel,email_normalized,phone_e164')
    .eq('birthday_messages_enabled', true)

  if (error) throw new Error(`BIRTHDAY_CANDIDATES_READ_FAILED:${error.code}`)

  return (data ?? []).flatMap((row) => {
    if (row.preferred_channel !== 'email' && row.preferred_channel !== 'whatsapp') return []
    const recipient = row.preferred_channel === 'email' ? row.email_normalized : row.phone_e164
    if (!recipient) return []
    return [{
      id: row.id,
      preferredName: row.preferred_name || row.civil_name,
      birthDate: row.birth_date,
      enabled: row.birthday_messages_enabled,
      channel: row.preferred_channel,
      recipient,
    }]
  })
}

export async function scheduleBirthdayGreetings(input: {
  now: Date
  enqueue: (message: BirthdayMessage) => Promise<boolean>
}): Promise<number> {
  return sendBirthdayGreetings({
    now: input.now,
    people: await loadBirthdayCandidates(),
    enqueue: input.enqueue,
  })
}
