import type { CashflowSnapshot } from '../application/get-cashflow-read-model'

export function CashflowSummary({ snapshot }: { snapshot: CashflowSnapshot }) {
  return <section aria-label="Resumo do fluxo de caixa"><h2>Fluxo de caixa</h2><dl><div><dt>Realizado</dt><dd>{snapshot.realizedCents} centavos</dd></div><div><dt>Projetado</dt><dd>{snapshot.projectedCents} centavos</dd></div></dl><small>Projeção não é contabilidade oficial</small></section>
}
