export type BirthdayPerson = { id: string; preferredName: string; birthDate: string; enabled: boolean; channel: 'whatsapp' | 'email'; recipient: string }
export type BirthdayMessage = { idempotencyKey: string; recipient: string; channel: BirthdayPerson['channel']; templateKey: 'birthday_greeting'; payload: { preferredName: string } }

function saoPauloMonthDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', month: '2-digit', day: '2-digit' }).format(date)
}

export async function sendBirthdayGreetings(input: { now: Date; people: BirthdayPerson[]; enqueue: (message: BirthdayMessage) => Promise<boolean> }): Promise<number> {
  const today = saoPauloMonthDay(input.now)
  const year = new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(input.now)
  let count = 0
  for (const person of input.people) {
    if (!person.enabled || !person.recipient || person.birthDate.slice(5) !== today) continue
    if (await input.enqueue({ idempotencyKey: `birthday:${person.id}:${year}`, recipient: person.recipient, channel: person.channel, templateKey: 'birthday_greeting', payload: { preferredName: person.preferredName } })) count += 1
  }
  return count
}
