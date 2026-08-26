export type CancellationPolicyCopy = { summary: string; fullText: string; deadlineText: string }

export function cancellationPolicyCopy(input: { fullText: string; deadline: string; now: string }): CancellationPolicyCopy {
  const deadline = new Date(input.deadline)
  const formatted = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(deadline)
  return {
    summary: 'Cancelamentos após o prazo e faltas podem gerar cobrança do horário reservado.',
    fullText: input.fullText,
    deadlineText: deadline > new Date(input.now) ? `Você pode cancelar sem cobrança até ${formatted}.` : 'O prazo para cancelamento sem cobrança já terminou.',
  }
}
