# Messaging and Automations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar comunicação administrativa confiável por WhatsApp/e-mail, confirmações 24h antes, cancelamento/reagendamento por link e automações de aniversário sem acoplamento a provedores.

**Architecture:** `messaging` possui outbox de negócio, adapters de provider e inbox deduplicada para webhooks. `automations` decide quando criar mensagens, mas não envia diretamente. As filas já são fornecidas por `src/platform/queue`; cada envio possui idempotency key estável.

**Tech Stack:** PostgreSQL, Supabase Queues/pgmq, Supabase Cron, Edge Functions/worker, Meta WhatsApp Business Cloud API adapter, e-mail transactional adapter, TypeScript, Vitest, pgTAP.

**Spec:** `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- Mensagens não contêm informação clínica, diagnóstico ou conteúdo de formulário.
- Canal preferido vem de `people`; fallback é configurável.
- Integração live fica desligada por feature flag em local/staging quando necessário.
- Um retry nunca cria nova mensagem lógica.
- Webhook duplicado deve ser ignorado deterministicamente.
- Confirmação 24h antes oferece Confirmar, Solicitar reagendamento e Cancelar.
- Reagendamento cria tarefa para secretaria; paciente não escolhe novo horário.

---

### Task 1: Contrato de mensageria e outbox

**Files:**
- Create: `supabase/migrations/20260824007000_messaging.sql`
- Create: `supabase/tests/070_messaging.sql`
- Create: `src/modules/messaging/domain/message.ts`
- Create: `src/modules/messaging/application/enqueue-message.ts`
- Create: `src/modules/messaging/application/dispatch-outbox.ts`
- Create: `src/modules/messaging/public.ts`
- Create: `src/modules/messaging/README.md`
- Test: `src/modules/messaging/application/enqueue-message.test.ts`

**Interfaces:**
- Consumes `QueuePort` da plataforma e queue `messaging` já criada no plano Foundation.
- Produces `MessagingProvider.send(message): Promise<ProviderDeliveryResult>`.
- Produces `enqueueMessage(input)` com `idempotencyKey` obrigatória.

- [ ] **Step 1: Testar idempotência da outbox**

```ts
it('returns the existing logical message for the same idempotency key', async () => {
  const first = await repo.enqueue(message('appointment:123:confirmation'))
  const second = await repo.enqueue(message('appointment:123:confirmation'))
  expect(second.id).toBe(first.id)
})
```

- [ ] **Step 2: Criar schema**

Criar `message_templates`, `outbound_messages`, `message_attempts`, `inbox_events`. `outbound_messages.idempotency_key` é unique; payload armazena apenas dados administrativos mínimos já renderizáveis/referenciáveis.

- [ ] **Step 3: Implementar dispatcher outbox -> queue**

Selecionar mensagens `queued` ainda não despachadas com lock/claim seguro; enviar job para `QueuePort` com a mesma `idempotencyKey`; marcar `dispatched_at`. Reexecução não duplica mensagem lógica.

- [ ] **Step 4: DB tests**

Testar unique idempotency key, claim concorrente e que anônimo/usuários comuns não leem `message_attempts`/inbox técnico.

- [ ] **Step 5: Commit**

```bash
git add supabase src/modules/messaging
git commit -m "feat: add durable messaging outbox"
```

---

### Task 2: Templates versionados e adapters de WhatsApp/e-mail

**Files:**
- Create: `src/modules/messaging/domain/template.ts`
- Create: `src/modules/messaging/application/render-template.ts`
- Create: `src/modules/messaging/infrastructure/meta-whatsapp-provider.ts`
- Create: `src/modules/messaging/infrastructure/email-provider.ts`
- Create: `src/modules/messaging/infrastructure/mock-provider.ts`
- Test: `src/modules/messaging/domain/template.test.ts`
- Test: `src/modules/messaging/infrastructure/mock-provider.test.ts`

**Interfaces:**
- Produces templates por `key + channel + version`.
- Provider recebe mensagem já classificada e não consulta banco de domínio.

- [ ] **Step 1: Definir chaves iniciais**

`appointment_confirmation`, `appointment_cancelled`, `reschedule_received`, `payment_admin_reminder`, `event_reminder`, `birthday_greeting`, `form_link`, `fiscal_document_ready`.

- [ ] **Step 2: Testar bloqueio de tokens clínicos**

Renderer deve rejeitar placeholders não permitidos. Lista permitida por template inclui, por exemplo, `preferredName`, `appointmentDate`, `appointmentTime`, `deadlineDate`, `deadlineTime`, `secureLink`; não inclui respostas clínicas.

- [ ] **Step 3: Implementar MockProvider**

Em local/tests, grava resultado em memória/fixture e nunca acessa rede.

- [ ] **Step 4: Implementar Meta adapter**

Só habilita chamada externa quando `WHATSAPP_LIVE_ENABLED=true`; usa endpoint/configuração oficial vigente, timeout explícito e external message id. Token vem de server env.

- [ ] **Step 5: Implementar e-mail adapter**

Usar interface `EmailTransport`; implementação live é configurada por env e não altera application layer. From/reply-to são centralizados.

- [ ] **Step 6: Testar sanitização**

Snapshot de todos templates confirma ausência de palavras/variáveis clínicas e ausência de CPF completo por padrão.

- [ ] **Step 7: Commit**

```bash
git add src/modules/messaging
git commit -m "feat: add neutral messaging providers and templates"
```

---

### Task 3: Worker de entrega, retries e inbox de webhook

**Files:**
- Create: `supabase/functions/messaging-worker/index.ts`
- Create: `src/modules/messaging/application/process-message.ts`
- Create: `src/modules/messaging/application/ingest-provider-event.ts`
- Create: `src/app/api/webhooks/messaging/[provider]/route.ts`
- Test: `src/modules/messaging/application/process-message.test.ts`
- Test: `tests/integration/messaging-webhook.test.ts`

**Interfaces:**
- Consumes queue `messaging`.
- Produces estados `queued|sending|sent|delivered|read|failed|dead_letter` e attempts append-only.

- [ ] **Step 1: Testar retry**

Falha transitória 429/5xx deve requeue com backoff e manter mesma logical message/idempotency key. 4xx permanente de validação vai para failed sem loop infinito.

- [ ] **Step 2: Implementar lease/ack**

Worker só arquiva queue item após persistir attempt/result. Em crash antes do ack, reprocessamento deve ser seguro.

- [ ] **Step 3: Implementar inbox deduplicada**

Webhook grava `provider + provider_event_id` unique antes de processar. Segundo POST idêntico retorna 2xx sem duplicar transição.

- [ ] **Step 4: Verificar assinatura de webhook**

Cada provider adapter implementa `verifyWebhook(request)`; rota rejeita assinatura inválida antes de persistir payload.

- [ ] **Step 5: Testes**

Cobrir duplicate webhook, out-of-order delivered/read, unknown message id e payload malformado.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions src/modules/messaging src/app/api/webhooks tests/integration
git commit -m "feat: add idempotent messaging worker"
```

---

### Task 4: Confirmação de consulta 24h antes

**Files:**
- Create: `src/modules/automations/application/schedule-appointment-confirmations.ts`
- Create: `src/modules/appointments/application/respond-to-confirmation.ts`
- Create: `src/modules/appointments/ui/public-confirmation.tsx`
- Create: `src/app/(capability)/consulta/page.tsx`
- Create: `supabase/migrations/20260824008000_appointment_confirmation.sql`
- Test: `src/modules/automations/application/schedule-appointment-confirmations.test.ts`
- Test: `tests/e2e/appointment-confirmation.spec.ts`

**Interfaces:**
- Produces uma mensagem lógica por consulta `appointment:<id>:confirmation:<starts_at>`.
- Produces ações públicas `confirm`, `request_reschedule`, `cancel`.

- [ ] **Step 1: Testar janela de seleção**

Consulta deve entrar na automação quando estiver na janela configurada de 24h, ainda ativa e sem confirmação terminal. Rodadas repetidas não duplicam mensagem.

- [ ] **Step 2: Criar capability específica**

Mensagem contém link com purpose `appointment_response`; capability só pode afetar o appointment associado.

- [ ] **Step 3: Renderizar consequência financeira antes do cancelamento**

Se `now <= cancellation_deadline_at`, UI informa cancelamento sem cobrança. Se `now > deadline`, UI informa que está fora do prazo e poderá haver cobrança conforme política aceita; exigir segunda confirmação.

- [ ] **Step 4: Reagendamento**

`request_reschedule` muda estado para `reschedule_requested` e cria tarefa administrativa; não altera horário nem financeiro.

- [ ] **Step 5: Falta de resposta**

Não enviar loops de mensagens por padrão. Agenda exibe `Sem resposta`; retry é apenas de falha técnica de entrega, não novo lembrete de negócio.

- [ ] **Step 6: E2E**

Cobrir Confirmar, Reagendar e Cancelar dentro/fora do prazo, incluindo histórico de quem/quando/canal.

- [ ] **Step 7: Commit**

```bash
git add src/modules/automations src/modules/appointments src/app/'(capability)' supabase tests/e2e
git commit -m "feat: automate appointment confirmations"
```

---

### Task 5: Cron de automações e aniversários

**Files:**
- Create: `src/modules/automations/application/run-daily-automations.ts`
- Create: `src/modules/automations/application/send-birthday-greetings.ts`
- Create: `src/modules/automations/application/create-cancellation-deadline-reminders.ts`
- Create: `src/modules/automations/public.ts`
- Create: `src/modules/automations/README.md`
- Create: `supabase/functions/automation-worker/index.ts`
- Test: `src/modules/automations/application/send-birthday-greetings.test.ts`

**Interfaces:**
- Produces daily jobs com correlation/idempotency key por data de negócio.
- Consumes People/Appointments/Messaging apenas por `public.ts`.

- [ ] **Step 1: Testar aniversário**

Só selecionar pessoa com `birthday_messages_enabled=true`, canal válido e aniversário na data local de São Paulo. Uma pessoa recebe no máximo uma saudação por ano.

- [ ] **Step 2: Implementar mensagem neutra**

Texto não menciona psicologia, terapia, atendimento, consulta ou saúde específica. Usar apenas nome preferido e saudação genérica.

- [ ] **Step 3: Implementar reminder pré-deadline como feature configurável**

Criar mensagem apenas quando configuração `cancellation_deadline_reminder_enabled=true`; idempotency key inclui appointment + policy deadline. O recurso pode ficar desligado sem afetar confirmação 24h.

- [ ] **Step 4: Configurar Supabase Cron**

Executar dispatcher em frequência adequada, nunca abaixo de uma granularidade que gere spam; worker usa lock/idempotência para concorrência segura.

- [ ] **Step 5: Teste de timezone**

Rodar casos próximos de meia-noite UTC e confirmar seleção pelo dia em `America/Sao_Paulo`.

- [ ] **Step 6: Gate completo**

Run: `npm run lint && npm run typecheck && npm run test:run && npm run supabase:test && npm run test:e2e && npm run build`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/modules/automations supabase/functions/automation-worker
git commit -m "feat: add safe scheduled automations"
```
