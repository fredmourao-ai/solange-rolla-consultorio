import type { EventFinancialInput } from '../application/get-event-financial-summary'
import { getEventFinancialSummary } from '../application/get-event-financial-summary'

export function EventFinancialSummary({ input }: { input: EventFinancialInput }) {
  const summary = getEventFinancialSummary(input)
  return <section aria-label="Resumo financeiro do evento"><h2>Financeiro do evento</h2><dl><div><dt>Receita líquida recebida</dt><dd>{summary.receivedNetCents} centavos</dd></div><div><dt>A receber</dt><dd>{summary.receivableCents} centavos</dd></div><div><dt>Resultado</dt><dd>{summary.resultCents} centavos</dd></div></dl></section>
}
