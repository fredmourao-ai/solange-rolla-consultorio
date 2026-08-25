# Appointments, Forms and Signatures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar agenda de consultas com política de cancelamento versionada, acesso público por capability link, formulários pré-atendimento criptografados e assinatura eletrônica simples com evidência imutável.

**Architecture:** `appointments`, `forms` e `signatures` são módulos separados. A agenda persiste o deadline calculado no momento do agendamento; forms não conhece financeiro; respostas L3 são cifradas antes de persistir; signature congela a submissão e grava hash/evidências sem permitir alteração destrutiva.

**Tech Stack:** TypeScript domain logic, PostgreSQL/RLS, Next.js Server Actions/Route Handlers, SensitiveDataCrypto AES-256-GCM, Supabase private Storage, Vitest, pgTAP, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- Timezone de negócio: `America/Sao_Paulo`.
- Política inicial: 48 horas computáveis; sábado e domingo contam zero horas; feriados ainda não são excluídos.
- Alterar política futura não recalcula consultas históricas.
- Appointment status não altera status financeiro diretamente.
- Paciente não precisa de conta.
- Token bruto de capability nunca é persistido nem logado.
- Respostas de formulário classificadas L3 nunca são persistidas em claro.
- Submissão assinada não recebe UPDATE/DELETE; correção gera nova versão.

---

### Task 1: Política de cancelamento e máquina de estados

**Files:**
- Create: `src/modules/appointments/domain/status.ts`
- Create: `src/modules/appointments/domain/cancellation-policy.ts`
- Create: `src/modules/appointments/domain/appointment.ts`
- Create: `src/modules/appointments/public.ts`
- Create: `src/modules/appointments/README.md`
- Test: `src/modules/appointments/domain/cancellation-policy.test.ts`
- Test: `src/modules/appointments/domain/status.test.ts`

**Interfaces:**
- Produces `calculateCancellationDeadline(startsAt: Date, policy: CancellationPolicy): Date`.
- Produces `transitionAppointment(current, command): AppointmentStatus`.

- [ ] **Step 1: Escrever testes de prazo antes do código**

```ts
it.each([
  ['2026-08-31T15:00:00-03:00', '2026-08-27T15:00:00-03:00'],
  ['2026-09-01T15:00:00-03:00', '2026-08-28T15:00:00-03:00'],
  ['2026-09-02T14:00:00-03:00', '2026-08-31T14:00:00-03:00'],
])('calculates 48 countable hours excluding weekends', (start, expected) => {
  expect(calculateCancellationDeadline(new Date(start), DEFAULT_POLICY).toISOString())
    .toBe(new Date(expected).toISOString())
})
```

Também testar atravessar virada de mês e ano, e garantir que sábado/domingo jamais decrementem saldo de horas.

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test -- src/modules/appointments/domain`
Expected: FAIL.

- [ ] **Step 3: Implementar algoritmo determinístico**

Algoritmo trabalha em timezone `America/Sao_Paulo`, anda para trás até consumir 48 horas válidas e pula intervalos cujo dia local seja sábado/domingo. Não consultar relógio global nem calendário externo.

- [ ] **Step 4: Implementar máquina de estados**

Estados: `scheduled`, `pending_confirmation`, `confirmed`, `reschedule_requested`, `rescheduled`, `cancelled_in_time`, `cancelled_late`, `completed`, `no_show`, `cancelled_by_provider`. Transições inválidas retornam erro de domínio.

- [ ] **Step 5: Verificar testes**

Run: `npm test -- src/modules/appointments/domain`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/appointments
 git commit -m "feat: add appointment policy and state machine"
```

---

### Task 2: Persistência, agenda e histórico

**Files:**
- Create: `supabase/migrations/20260824003000_appointments.sql`
- Create: `supabase/tests/030_appointments_rls.sql`
- Create: `src/modules/appointments/application/create-appointment.ts`
- Create: `src/modules/appointments/application/change-appointment-status.ts`
- Create: `src/modules/appointments/application/list-calendar.ts`
- Create: `src/modules/appointments/ui/calendar.tsx`
- Create: `src/modules/appointments/ui/appointment-dialog.tsx`
- Create: `src/app/(protected)/agenda/page.tsx`

**Interfaces:**
- Produces tables `services`, `cancellation_policies`, `appointments`, `appointment_status_history`.
- Produces `createAppointment()` que persiste `policy_version` e `cancellation_deadline_at`.

- [ ] **Step 1: Criar migration com constraints**

`appointments.price_cents bigint check (price_cents >= 0)`, `ends_at > starts_at`, `business_timezone not null`, status limitado aos estados públicos. `appointment_status_history` é append-only por policies/triggers apropriados.

- [ ] **Step 2: Seed da política inicial**

Criar política v1 com `countable_hours=48`, weekend excluded `[6,0]`, `late_cancellation_charge_enabled=true`, `no_show_charge_enabled=true` e vigência definida.

- [ ] **Step 3: Testar snapshot histórico**

Criar consulta usando v1, depois inserir v2 com 24h e comprovar que `cancellation_deadline_at` da consulta v1 permanece inalterado.

- [ ] **Step 4: Implementar agenda day/week/month**

UI lê read model do módulo e não calcula prazo no browser. Appointment dialog mostra explicitamente `Cancelamento sem cobrança até DD/MM/YYYY HH:mm`.

- [ ] **Step 5: Testar RLS**

Owner/secretary podem gerir agenda; accounting não altera consulta; anônimo não lê calendário.

- [ ] **Step 6: Commit**

```bash
git add supabase src/modules/appointments src/app/'(protected)'/agenda
 git commit -m "feat: add appointment persistence and calendar"
```

---

### Task 3: Capability links de escopo mínimo

**Files:**
- Create: `supabase/migrations/20260824004000_capabilities.sql`
- Create: `supabase/tests/040_capabilities.sql`
- Create: `src/platform/capabilities/token.ts`
- Create: `src/platform/capabilities/cookie.ts`
- Create: `src/platform/capabilities/verify.ts`
- Create: `src/app/c/[token]/route.ts`
- Create: `src/app/(capability)/layout.tsx`
- Test: `src/platform/capabilities/token.test.ts`
- Test: `tests/e2e/capability.spec.ts`

**Interfaces:**
- Produces `issueCapability({ purpose, subjectId, expiresAt }): { rawToken, id }` server-only.
- Produces cookie HttpOnly scoped à capability após troca do token.

- [ ] **Step 1: Testar token/hash**

```ts
it('stores only a one-way hash', async () => {
  const { rawToken, tokenHash } = await createCapabilityMaterial()
  expect(rawToken).not.toBe(tokenHash)
  expect(tokenHash).toMatch(/^[a-f0-9]{64}$/)
})
```

- [ ] **Step 2: Implementar material criptográfico**

Gerar no mínimo 32 bytes aleatórios via `crypto.randomBytes`; armazenar SHA-256 hexadecimal. Comparação do hash deve ser timing-safe quando aplicável.

- [ ] **Step 3: Migration e regras**

Tabela `capabilities` contém `token_hash unique`, `purpose`, `subject_type`, `subject_id`, `expires_at`, `revoked_at`, `used_at`, timestamps. Nenhum SELECT público direto; verificação ocorre em função server-side controlada.

- [ ] **Step 4: Implementar exchange**

`GET /c/[token]` valida finalidade/expiração, grava cookie HttpOnly+Secure+SameSite=Lax com identificador opaco e redireciona para URL limpa sem token. Logs não incluem params brutos.

- [ ] **Step 5: E2E**

Testar token válido, expirado, revogado, finalidade errada e replay após capacidade one-time. Confirmar que URL final não contém raw token.

- [ ] **Step 6: Commit**

```bash
git add supabase src/platform/capabilities src/app/c src/app/'(capability)' tests/e2e
 git commit -m "feat: add scoped patient capability links"
```

---

### Task 4: Formulários versionados e submissão criptografada

**Files:**
- Create: `supabase/migrations/20260824005000_forms.sql`
- Create: `supabase/tests/050_forms.sql`
- Create: `src/modules/forms/domain/form-schema.ts`
- Create: `src/modules/forms/application/start-submission.ts`
- Create: `src/modules/forms/application/save-draft.ts`
- Create: `src/modules/forms/application/read-submission.ts`
- Create: `src/modules/forms/application/submit-form.ts`
- Create: `src/modules/forms/ui/form-renderer.tsx`
- Create: `src/modules/forms/public.ts`
- Create: `src/modules/forms/README.md`
- Test: `src/modules/forms/domain/form-schema.test.ts`
- Test: `src/modules/forms/application/save-draft.test.ts`

**Interfaces:**
- Produces `FormTemplateVersion`, `FormSubmissionId` e renderer baseado em schema versionado.
- Consumes `SensitiveDataCrypto` da plataforma para qualquer template classificado `sensitive`.
- `forms` não importa `appointments/infrastructure`; recebe apenas IDs/referências por contrato público.

- [ ] **Step 1: Definir schema suportado e classificação**

Tipos iniciais de campo: `short_text`, `long_text`, `date`, `single_choice`, `multi_choice`, `boolean`, `email`, `phone`, `cpf`, `declaration`. Cada template possui `data_classification: 'administrative' | 'sensitive'`; pré-consulta clínica é `sensitive` por padrão.

- [ ] **Step 2: Testar versão e required**

Garantir que uma submissão iniciada com template v1 continua apontando v1 mesmo após ativar template v2.

- [ ] **Step 3: Testar ausência de plaintext no repository**

Para template `sensitive`, salvar draft contendo sentinela `FORM_SENSITIVE_SENTINEL` e confirmar que o repository recebe somente `answers_ciphertext`, `answers_iv`, `answers_auth_tag`, `key_version`, sem a sentinela.

- [ ] **Step 4: Migration**

Criar `form_templates`, `form_template_versions`, `form_submissions`, `form_submission_versions`. Submissões administrativas podem usar JSONB mínimo; submissões sensíveis usam envelope cifrado com `answers_ciphertext`, `answers_iv`, `answers_auth_tag`, `key_version`. Estado: `draft|submitted|signed|superseded`.

- [ ] **Step 5: Implementar read server-side**

`readSubmission` autoriza, carrega envelope, decripta em memória e retorna respostas somente ao server component/use-case autorizado. Plaintext não é enviado para logs, cache persistente ou storage intermediário.

- [ ] **Step 6: Implementar experiência mobile/idosos**

Fonte mínima legível, labels acima dos campos, botões grandes, sem login, salvar/continuar, página final de revisão antes da declaração.

- [ ] **Step 7: Testar capability scope**

Capability de `form_fill` só acessa a submissão vinculada; não lista pacientes nem outras submissões.

- [ ] **Step 8: Commit**

```bash
git add supabase src/modules/forms
 git commit -m "feat: add encrypted versioned intake forms"
```

---

### Task 5: Assinatura simples, imutabilidade e evidências

**Files:**
- Create: `supabase/migrations/20260824006000_signatures.sql`
- Create: `supabase/tests/060_signatures_immutability.sql`
- Create: `src/modules/signatures/domain/canonicalize.ts`
- Create: `src/modules/signatures/domain/hash.ts`
- Create: `src/modules/signatures/application/sign-submission.ts`
- Create: `src/modules/signatures/ui/signature-step.tsx`
- Create: `src/modules/signatures/public.ts`
- Create: `src/modules/signatures/README.md`
- Test: `src/modules/signatures/domain/hash.test.ts`

**Interfaces:**
- Produces `signSubmission(input): Promise<SignatureEvidence>`.
- Produces `canonicalHashSha256` estável para o mesmo conteúdo.

- [ ] **Step 1: Testar canonicalização**

```ts
it('produces the same hash independent of object key insertion order', () => {
  expect(hashCanonical({ a: 1, b: 2 })).toBe(hashCanonical({ b: 2, a: 1 }))
})
```

- [ ] **Step 2: Implementar canonicalização determinística**

Ordenar chaves recursivamente, preservar ordem de arrays, normalizar strings Unicode e serializar sem dados voláteis. Para submissão sensível, decriptar no servidor somente para canonicalizar/gerar documento e descartar plaintext após a operação.

- [ ] **Step 3: Migration de evidência**

Criar `signature_evidence` com submission/version, declaration_version, typed_name, optional signature_asset_path, signed_at, canonical_hash_sha256, channel/source metadata sanitizada e `document_status`. Não duplicar respostas em claro nessa tabela.

- [ ] **Step 4: Travar versão assinada no banco**

Trigger rejeita UPDATE/DELETE de submission version cujo estado é `signed`; correções só podem criar versão nova com `supersedes_id`.

- [ ] **Step 5: Implementar UX**

Mostrar declaração aprovada no produto; permitir nome digitado e assinatura desenhada opcional; botão final `CONFIRMAR E ASSINAR`; registrar uma única operação transacional.

- [ ] **Step 6: Gerar pedido de documento assíncrono**

Na mesma transação da assinatura, criar registro `document_jobs`/outbox com idempotency key `signed-form:<submission-version-id>`. Renderer server-side produz PDF em memória, armazena em `signed-documents-private` e não grava arquivo temporário público.

- [ ] **Step 7: Testes negativos**

Tentar editar resposta assinada via app e SQL; ambos devem falhar. Repetir `signSubmission` com mesma idempotency key deve retornar evidência existente, não duplicar assinatura. Logs de teste não podem conter sentinela de resposta sensível.

- [ ] **Step 8: Commit**

```bash
git add supabase src/modules/signatures
 git commit -m "feat: add immutable simple signatures"
```

---

### Task 6: Fluxo público completo de pré-consulta

**Files:**
- Create: `src/app/(capability)/formulario/page.tsx`
- Create: `src/app/(capability)/formulario/revisao/page.tsx`
- Create: `src/app/(capability)/formulario/assinar/page.tsx`
- Create: `tests/e2e/intake-signature.spec.ts`

**Interfaces:**
- Consumes capability + forms + signatures public APIs.
- Produces fluxo sem conta: link -> draft cifrado -> review server-side -> declaration -> signature -> success.

- [ ] **Step 1: E2E falhando**

Criar cenário sintético com capability válida e exigir que a submissão termine `signed`, o token seja revogado/reduzido e a versão fique imutável.

- [ ] **Step 2: Implementar composição de páginas**

`src/app` apenas orquestra componentes/public APIs; nenhuma regra de domínio dentro de page/route. Rotas de formulário sensível usam `no-store`.

- [ ] **Step 3: Executar E2E**

Run: `npm run test:e2e -- tests/e2e/intake-signature.spec.ts`
Expected: PASS.

- [ ] **Step 4: Executar gate completo**

Run: `npm run lint && npm run typecheck && npm run test:run && npm run supabase:test && npm run test:e2e && npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/'(capability)' tests/e2e/intake-signature.spec.ts
 git commit -m "feat: complete secure patient intake and signature flow"
```
