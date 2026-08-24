# Contract Terms and Policy Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Versionar contrato/termos administrativos, política de cancelamento/cobrança e prova de aceite para que cada consulta saiba exatamente qual regra foi apresentada ao paciente.

**Architecture:** Termos vivem como documentos versionados dentro do domínio forms/signatures, não como strings espalhadas pela UI. Appointment referencia a política operacional; aceite referencia a versão textual correspondente. Mudança material cria nova versão e nunca altera documento já aceito.

**Tech Stack:** PostgreSQL, TypeScript, Forms/Signatures public APIs, capability flow, SHA-256, Vitest, pgTAP.

**Spec:** `docs/LEGAL_COMPLIANCE.md` e `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- Texto final para produção exige revisão jurídica antes do go-live.
- A versão exibida/aceita é persistida e imutável.
- Política inicial: 48 horas computáveis; sábado e domingo excluídos.
- Toda mensagem de confirmação informa que cancelamentos após o prazo e faltas podem gerar cobrança do horário reservado.
- Confirmação de consulta repete a regra vigente, mas não cria nem altera prazo.
- Não usar linguagem de “multa” sem validação jurídica específica; referir cobrança do horário reservado.

---

### Task 1: Documento legal versionado

**Files:**
- Create: `supabase/migrations/20260824004500_legal_terms.sql`
- Create: `supabase/tests/045_legal_terms.sql`
- Create: `src/modules/forms/domain/legal-document.ts`
- Create: `src/modules/forms/application/get-active-legal-document.ts`
- Create: `src/modules/forms/application/accept-legal-document.ts`
- Test: `src/modules/forms/domain/legal-document.test.ts`

**Interfaces:**
- Produces `LegalDocumentVersion { id, key, version, contentHash, effectiveFrom, supersedesId? }`.
- Chaves iniciais: `service_terms`, `cancellation_policy`, `truthfulness_declaration`, `privacy_notice`.

- [ ] **Step 1: Testar imutabilidade/versionamento**

```ts
it('keeps a previously accepted version unchanged after a new version is activated', () => {
  const accepted = acceptanceFor(version1)
  activate(version2)
  expect(accepted.documentVersionId).toBe(version1.id)
})
```

- [ ] **Step 2: Migration**

Criar `legal_documents`, `legal_document_versions`, `legal_acceptances`. `legal_document_versions.content` é texto administrativo/legal, não conteúdo clínico; registrar SHA-256 do conteúdo e vigência. UPDATE/DELETE de versão já aceita deve ser bloqueado.

- [ ] **Step 3: Aceite**

`legal_acceptances` registra person, document/version, accepted_at, signature evidence/ref quando aplicável, channel/capability id sanitizado e content hash. Unique lógico evita duplicação acidental da mesma versão/pessoa.

- [ ] **Step 4: RLS**

Owner pode administrar versões ainda não usadas; secretary pode visualizar status de aceite e iniciar envio; paciente por capability acessa somente documento ligado ao seu fluxo; accounting não precisa de conteúdo integral por padrão.

- [ ] **Step 5: Commit**

```bash
git add supabase src/modules/forms
git commit -m "feat: add versioned legal terms and acceptance"
```

---

### Task 2: Política de cancelamento textual ligada à política operacional

**Files:**
- Modify: `supabase/migrations/20260824003000_appointments.sql` antes de aplicada, ou Create migration corretiva se já aplicada
- Create: `src/modules/appointments/domain/policy-copy.ts`
- Create: `src/modules/appointments/application/get-cancellation-policy-copy.ts`
- Test: `src/modules/appointments/domain/policy-copy.test.ts`

**Interfaces:**
- `cancellation_policies` referencia `legal_document_version_id` da política textual aprovada.
- Produces `CancellationPolicyCopy { summary, fullText, deadlineText }`.

- [ ] **Step 1: Testar vínculo obrigatório**

Uma política operacional ativa para novos agendamentos não pode entrar em vigor sem versão textual correspondente em ambiente production.

- [ ] **Step 2: Texto-base inicial**

Usar como conteúdo de staging uma versão explicitamente marcada `DRAFT_LEGAL_REVIEW_REQUIRED` baseada em `docs/LEGAL_COMPLIANCE.md`: cancelamento sem cobrança com 48 horas computáveis; sábado/domingo não contam; cancelamento posterior/falta podem gerar cobrança do horário reservado; situações excepcionais podem receber isenção manual. Production bloqueia versão marcada draft.

- [ ] **Step 3: Deadline individual**

Mensagem/UI nunca exige que paciente faça a conta; exibir `Você pode cancelar sem cobrança até DD/MM às HH:mm`, derivado do `cancellation_deadline_at` persistido.

- [ ] **Step 4: Testar histórico**

Consulta criada com policy v1/legal v1 continua apontando ambas mesmo depois de policy/legal v2 serem ativadas.

- [ ] **Step 5: Commit**

```bash
git add supabase src/modules/appointments
git commit -m "feat: bind cancellation rules to legal copy"
```

---

### Task 3: Termos no formulário e assinatura

**Files:**
- Create: `src/modules/forms/ui/legal-terms-step.tsx`
- Modify: `src/modules/signatures/application/sign-submission.ts`
- Modify: `src/modules/signatures/domain/canonicalize.ts`
- Test: `src/modules/signatures/application/sign-submission.test.ts`
- Test: `tests/e2e/legal-acceptance.spec.ts`

**Interfaces:**
- Signed payload inclui IDs/versões/hashes dos documentos legais aceitos.

- [ ] **Step 1: UI clara e destacada**

Antes da assinatura, mostrar política de cancelamento/falta em seção própria, com checkbox explícito `Li e estou de acordo com as condições de agendamento, cancelamento, faltas e cobrança.` Não pré-marcar checkbox.

- [ ] **Step 2: Declaração de veracidade**

Mostrar declaração separada: `Declaro que as informações fornecidas por mim são verdadeiras e correspondem ao que informei neste formulário.` O texto final de produção é substituído somente após revisão jurídica, preservando versão/hash.

- [ ] **Step 3: Canonicalização**

Hash do pacote assinado inclui versão do form, respostas, IDs/hashes dos termos e declarações. Alterar qualquer documento legal muda o hash.

- [ ] **Step 4: E2E negativo**

Paciente não consegue assinar sem aceitar os checkboxes obrigatórios; reload/retry não duplica `legal_acceptances`.

- [ ] **Step 5: Commit**

```bash
git add src/modules/forms src/modules/signatures tests/e2e/legal-acceptance.spec.ts
git commit -m "feat: include legal terms in signed intake"
```

---

### Task 4: Repetição da política na confirmação/cancelamento

**Files:**
- Modify: `src/modules/messaging/domain/template.ts`
- Modify: `src/modules/automations/application/schedule-appointment-confirmations.ts`
- Modify: `src/modules/appointments/ui/public-confirmation.tsx`
- Test: `src/modules/automations/application/schedule-appointment-confirmations.test.ts`
- Test: `tests/e2e/appointment-confirmation.spec.ts`

**Interfaces:**
- Confirmação recebe `policyVersion`, `legalDocumentVersion`, `cancellationDeadlineAt` do appointment snapshot.

- [ ] **Step 1: Mensagem antes/depois do prazo**

Toda confirmação inclui, em linguagem clara, que **cancelamentos efetuados após o prazo aplicável e faltas podem gerar cobrança do horário reservado, conforme condições previamente aceitas**. Se o prazo ainda estiver aberto, informar também o deadline exato para cancelamento sem cobrança. Se o prazo estiver encerrado, informar explicitamente que ele já terminou. O texto usado é derivado da versão jurídica ligada ao snapshot da consulta.

- [ ] **Step 2: Não criar novo prazo**

Timestamp da mensagem nunca recalcula `cancellation_deadline_at`; o texto usa o snapshot existente.

- [ ] **Step 3: Tela de cancelamento tardio**

Antes de confirmar cancelamento fora do prazo, repetir consequência e exigir confirmação adicional. Registrar ação, timestamp e versão da política mostrada.

- [ ] **Step 4: Gate jurídico**

`GO_LIVE_CHECKLIST.md` deve bloquear produção até `service_terms`, `cancellation_policy`, `truthfulness_declaration` e `privacy_notice` possuírem versão production aprovada, sem flag draft.

- [ ] **Step 5: Commit**

```bash
git add src/modules/messaging src/modules/automations src/modules/appointments tests/e2e
git commit -m "feat: repeat accepted cancellation policy in reminders"
```
