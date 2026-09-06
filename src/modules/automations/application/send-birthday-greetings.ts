export type BirthdayPerson = {
  id: string
  preferredName: string
  birthDate: string
  enabled: boolean
  channel: 'whatsapp' | 'email'
  recipient: string
}

export type BirthdayMessage = {
  idempotencyKey: string
  recipient: string
  channel: BirthdayPerson['channel']
  templateKey: 'birthday_greeting'
  payload: { preferredName: string }
}

function saoPauloDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export async function sendBirthdayGreetings(input: {
  now: Date
  people: BirthdayPerson[]
  enqueue: (message: BirthdayMessage) => Promise<boolean>
}): Promise<number> {
  const today = saoPauloDateKey(input.now)
  const monthDay = today.slice(5)
  let count = 0

  for (const person of input.people) {
    if (!person.enabled || !person.recipient || person.birthDate.slice(5) !== monthDay) continue
    const message: BirthdayMessage = {
      idempotencyKey: `birthday:${person.id}:${today}:birthday_greeting`,
      recipient: person.recipient,
      channel: person.channel,
      templateKey: 'birthday_greeting',
      payload: { preferredName: person.preferredName },
    }
    if (await input.enqueue(message)) count += 1
  }

  return count
}
