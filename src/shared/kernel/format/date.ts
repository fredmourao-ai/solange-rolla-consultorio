const BUSINESS_TIMEZONE = 'America/Sao_Paulo'

export function formatBusinessDateTime(value: string | Date, timeZone = BUSINESS_TIMEZONE): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date).replace(',', '')
}
