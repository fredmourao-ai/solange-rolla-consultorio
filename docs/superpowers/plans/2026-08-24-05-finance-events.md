# Finance and Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar contas a receber/pagar, pagamentos e fluxo de caixa integrados a consultas e eventos, mantendo estados financeiros independentes da agenda e do fiscal.

**Architecture:** `receivables` e `payables` são domínios financeiros separados; `events` referencia Pessoa e solicita recebíveis por contrato público. Valores monetários são `bigint` em centavos. Toda baixa, ajuste, devolução e estorno é auditável e idempotente; lançamentos históricos nunca são sobrescritos para “corrigir” saldo.

**Tech Stack:** PostgreSQL, TypeScript domain logic, Next.js Server Actions, Supabase private Storage para comprovantes, Vitest, pgTAP, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- Nenhum valor monetário usa float.
- Consulta/evento pode existir sem pagamento; pagamento pode ocorrer antes ou depois do serviço.
- Status de appointment/event registration não é status financeiro.
- Paciente e pagador/tomador podem ser pessoas diferentes.
- Ajuste, desconto, isenção, reembolso e estorno exigem motivo e ator.
- Registros financeiros relevantes não são apagados fisicamente.
- Pagamento original permanece registrado mesmo após cancelamento/reembolso.

---

### Task 1: Contas a receber e ciclo de vida financeiro

**Files:**
- Create: `supabase/migrations/20260824009000_receivables.sql`
- Create: `supabase/tests/090_receivables.sql`
- Create: `src/modules/receivables/domain/receivable.ts`
- Create: `src/modules/receivables/domain/status.ts`
- Create: `src/modules/receivables/application/create-receivable.ts`
- Create: `src/modules/receivables/application/apply-adjustment.ts`
- Create: `src/modules/receivables/public.ts`
- Create: `src/modules/receivables/README.md`
- Test: `src/modules/receivables/domain/receivable.test.ts`

**Interfaces:**
- Produces `createReceivable({ sourceType, sourceId, personId, payerPersonId, amountCents, dueAt, idempotencyKey })`.
- Produces status `open|partial|paid|overdue|refund_due|refunded|voided`.
- Produces valores derivados `chargeAmountCents`, `netPaidCents`, `balanceCents`, `refundDueCents`.

- [ ] **Step 1: Testar invariantes de saldo**

```ts
it('never allows an applied payment above the current charge without explicit credit handling', () => {
  expect(() => applyPayment(receivable(30000), 40000)).toThrow('PAYMENT_EXCEEDS_BALANCE')
})
```

- [ ] **Step 2: Testar criação idempotente por origem**

Mesmo `source_type + source_id + charge_kind` deve retornar recebível existente, não criar cobrança duplicada.

- [ ] **Step 3: Migration**

Criar `receivables`, `receivable_adjustments`, constraints de valores não negativos, unique para source/idempotency e timestamps. `charge_amount_cents`, `net_paid_cents`, `balance_cents` e `refund_due_cents` são derivados por query/transactional projection a partir de original, adjustments, payments e refunds; UI nunca os edita diretamente.

- [ ] **Step 4: Política de consulta sem pagamento prévio**

Ao criar consulta cobrável, criar recebível previsto uma única vez. `cancelled_in_time` sem pagamento aplica adjustment `cancellation_waiver` até charge 0 e status `voided`; `cancelled_late`/`no_show` mantém ou cria cobrança conforme snapshot da política. Isenção manual gera adjustment `waiver` com motivo.

- [ ] **Step 5: Política de consulta já paga**

Se `cancelled_in_time` ocorrer após pagamento, aplicar `cancellation_waiver` para zerar o charge devido, preservar o pagamento original e calcular `refund_due_cents = netPaidCents`; status vira `refund_due`. Não criar refund automático silencioso. Depois que refunds totalizarem o valor devido, status passa a `refunded`.

- [ ] **Step 6: Testes**

Cobrir consulta realizada, cancelada dentro do prazo sem pagamento, cancelada dentro do prazo já paga, cancelada fora do prazo, falta e isenção. Confirmar que appointment status não é alterado pelo módulo financeiro e que nenhum lançamento histórico é deletado.

- [ ] **Step 7: Commit**

```bash
git add supabase src/modules/receivables
git commit -m "feat: add receivables lifecycle"
```

---

### Task 2: Pagamentos, múltiplas formas e reembolsos

**Files:**
- Create: `supabase/migrations/20260824010000_payments.sql`
- Create: `supabase/tests/100_payments.sql`
- Create: `src/modules/receivables/domain/payment.ts`
- Create: `src/modules/receivables/application/record-payment.ts`
- Create: `src/modules/receivables/application/refund-payment.ts`
- Create: `src/modules/receivables/ui/payment-dialog.tsx`
- Create: `src/modules/receivables/ui/refund-dialog.tsx`
- Test: `src/modules/receivables/application/record-payment.test.ts`
- Test: `src/modules/receivables/application/refund-payment.test.ts`

**Interfaces:**
- Produces `recordPayment({ receivableId, amountCents, paidAt, method, externalReference?, idempotencyKey })`.
- Produces `refundPayment({ paymentId, amountCents, refundedAt, method, reason, externalReference?, idempotencyKey })`.
- Métodos iniciais: `pix|cash|debit_card|credit_card|bank_transfer|other`.

- [ ] **Step 1: Testar pagamento parcial**

Recebível 30000 + pagamento 10000 => status `partial`, balance 20000. Segundo pagamento 20000 => `paid`, balance 0.

- [ ] **Step 2: Testar múltiplas formas**

Dois pagamentos distintos no mesmo recebível podem usar Pix + dinheiro; soma determina status, sem campo único `payment_method` no recebível.

- [ ] **Step 3: Migration**

Criar `payments`, `payment_refunds`; ambas possuem `idempotency_key unique`; amount > 0; timestamps; audit actor. Refund referencia pagamento original e nunca o substitui/deleta.

- [ ] **Step 4: Limites de refund**

Soma de refunds de um pagamento não pode exceder seu valor. Refund parcial é permitido. Repetir mesma idempotency key retorna o mesmo lançamento.

- [ ] **Step 5: UI de baixa/reembolso**

Pagamento mostra valor previsto, saldo, valor recebido, data/hora e forma. Refund mostra valor devolvível, valor da devolução, data, método, motivo e referência. Histórico apresenta payment e refund como eventos separados.

- [ ] **Step 6: Testar concorrência**

Dois requests simultâneos tentando quitar o mesmo saldo não podem exceder o saldo; dois refunds concorrentes não podem devolver mais que o pagamento. Usar lock/transação no repositório.

- [ ] **Step 7: Commit**

```bash
git add supabase src/modules/receivables
git commit -m "feat: add auditable payments and refunds"
```

---

### Task 3: Contas a pagar e recorrência

**Files:**
- Create: `supabase/migrations/20260824011000_payables.sql`
- Create: `supabase/tests/110_payables.sql`
- Create: `src/modules/payables/domain/payable.ts`
- Create: `src/modules/payables/domain/recurrence.ts`
- Create: `src/modules/payables/application/create-payable.ts`
- Create: `src/modules/payables/application/generate-recurring-payables.ts`
- Create: `src/modules/payables/application/record-payable-payment.ts`
- Create: `src/modules/payables/public.ts`
- Create: `src/modules/payables/README.md`
- Test: `src/modules/payables/domain/recurrence.test.ts`

**Interfaces:**
- Produces despesa avulsa/recorrente e baixa de pagamento.
- Produces idempotency key de recorrência `recurrence:<rule-id>:<competence>`.

- [ ] **Step 1: Testar recorrência mensal**

Regra dia 10, iniciada em setembro/2026, gera exatamente uma obrigação por competência, mesmo com job executado repetidamente. Regra mensal em dia 29/30/31 usa o último dia válido do mês quando o dia não existir, conforme opção explícita `month_end_fallback='last_day'`.

- [ ] **Step 2: Migration**

Criar `vendors`, `expense_categories`, `payables`, `payable_payments`, `recurrence_rules`. Comprovantes são paths em bucket privado `financial-receipts-private`.

- [ ] **Step 3: Categorias seed**

Inserir aluguel, condomínio, energia, internet, telefone, contabilidade, impostos, CRP, cursos/formação, supervisão, marketing, software, material, manutenção, outras.

- [ ] **Step 4: Baixa e anexos**

Registrar data, valor, forma e comprovante; pagamento parcial é permitido se a prática operacional exigir, usando múltiplas linhas de `payable_payments`.

- [ ] **Step 5: Teste de RLS**

Owner acessa tudo; accounting acessa financeiro; secretary pode ter acesso financeiro operacional somente se policy explicitamente aprovada/configurada, sem acesso clínico.

- [ ] **Step 6: Commit**

```bash
git add supabase src/modules/payables
git commit -m "feat: add payables and recurring expenses"
```

---

### Task 4: Fluxo de caixa e projeção

**Files:**
- Create: `src/modules/receivables/application/get-revenue-summary.ts`
- Create: `src/modules/payables/application/get-expense-summary.ts`
- Create: `src/modules/reports/application/get-cashflow-read-model.ts`
- Create: `src/modules/reports/ui/cashflow-summary.tsx`
- Test: `src/modules/reports/application/get-cashflow-read-model.test.ts`

**Interfaces:**
- Produces `CashflowSnapshot` com recebido, refunds, a receber, vencido, pago, a pagar, realizado e projetado.

- [ ] **Step 1: Criar fixture sintética**

Receitas: 1285000 recebidos, 50000 reembolsados e 240000 abertos; despesas: 415000 pagas + 123000 futuras. Teste deve validar totais em centavos, sem arredondamento binário.

- [ ] **Step 2: Implementar read model**

Resultado realizado = pagamentos recebidos - refunds efetivados - despesas pagas no período. Projetado = realizado + recebíveis previstos elegíveis - refunds pendentes - payables a vencer, sempre com labels de que projeção não é contabilidade oficial.

- [ ] **Step 3: Separar competência e caixa**

Queries devem permitir filtro por `paid_at/refunded_at` (caixa) e por competência/origem quando necessário; não misturar silenciosamente.

- [ ] **Step 4: Testar timezone de fechamento mensal**

Pagamento ou refund às 00:30 UTC deve ser classificado pelo dia/mês local em `America/Sao_Paulo` quando relatório for por data de negócio.

- [ ] **Step 5: Commit**

```bash
git add src/modules/reports src/modules/receivables src/modules/payables
git commit -m "feat: add cashflow read model"
```

---

### Task 5: Eventos, agenda e inscrições

**Files:**
- Create: `supabase/migrations/20260824012000_events.sql`
- Create: `supabase/tests/120_events.sql`
- Create: `src/modules/events/domain/event.ts`
- Create: `src/modules/events/domain/registration.ts`
- Create: `src/modules/events/application/create-event.ts`
- Create: `src/modules/events/application/register-person.ts`
- Create: `src/modules/events/application/mark-attendance.ts`
- Create: `src/modules/events/public.ts`
- Create: `src/modules/events/README.md`
- Create: `src/modules/events/ui/event-calendar.tsx`
- Create: `src/modules/events/ui/participant-list.tsx`
- Create: `src/app/(protected)/eventos/page.tsx`
- Test: `src/modules/events/domain/registration.test.ts`

**Interfaces:**
- Produces `EventId`, `EventRegistrationId` e agenda de eventos.
- Consumes `PersonId` por people public API; não cria cadastro paralelo.

- [ ] **Step 1: Testar capacidade/lista de espera**

Evento capacidade 20: inscrições 1..20 ficam `confirmed/pending_payment` conforme regra; 21ª entra `waitlisted` se lista de espera habilitada.

- [ ] **Step 2: Migration**

Criar `events`, `event_registrations`, `event_registration_status_history`, `event_expenses`. Unique `event_id + person_id` para evitar inscrição duplicada ativa.

- [ ] **Step 3: Criar evento**

Campos: título, descrição, tipo, starts/ends, timezone, local/modalidade, capacity, default_price_cents, formulário requerido opcional, status `planned|open|full|completed|cancelled`.

- [ ] **Step 4: Registrar participante**

Busca/reusa Pessoa existente; se nova, UI chama fluxo People. Inscrição armazena preço snapshot, status e `attendance_status` separado.

- [ ] **Step 5: Presença mobile**

Lista simples permite marcar `present|absent|unknown`; ação auditada, sem conteúdo clínico.

- [ ] **Step 6: Agenda combinada**

Criar read model que permite filtros `consultas|eventos|tudo`, sem transformar cada participante em item de calendário.

- [ ] **Step 7: Commit**

```bash
git add supabase src/modules/events src/app/'(protected)'/eventos
git commit -m "feat: add events and participant agenda"
```

---

### Task 6: Financeiro por evento

**Files:**
- Create: `src/modules/events/application/create-registration-receivable.ts`
- Create: `src/modules/events/application/get-event-financial-summary.ts`
- Create: `src/modules/events/ui/event-financial-summary.tsx`
- Test: `src/modules/events/application/get-event-financial-summary.test.ts`

**Interfaces:**
- Consumes Receivables public API e Payables/referenced event expenses.
- Produces `EventFinancialSummary` sem duplicar tabelas financeiras.

- [ ] **Step 1: Recebível por participante**

Inscrição paga gera/possui um recebível individual com source `event_registration`; cortesia gera preço 0 ou adjustment documentado, conforme regra de domínio.

- [ ] **Step 2: Testar resumo**

Calcular vagas, inscritos, receita potencial, recebido líquido de refunds, a receber, refunds pendentes, despesas e resultado do evento a partir das fontes financeiras reais.

- [ ] **Step 3: Cancelamento/reembolso**

Cancelamento de inscrição não apaga pagamento; se houver devolução, usar `refundPayment`. Regras de cancelamento de evento ficam separadas das regras de consulta até definição explícita.

- [ ] **Step 4: Gate completo**

Run: `npm run lint && npm run typecheck && npm run test:run && npm run supabase:test && npm run test:e2e && npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/modules/events
git commit -m "feat: integrate event finances"
```
