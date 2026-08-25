# Public Edge Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Endurecer páginas públicas/capability sem adicionar fricção ao paciente, protegendo contra abuso, CSRF, enumeração, framing e vazamento de tokens.

**Architecture:** Capability continua sendo o mecanismo de autorização pública. Controles web são uma camada adicional: headers/CSP, validação de Origin, rate limiting privacy-safe, respostas genéricas e limites de request. Nenhum controle de borda substitui capability/RLS.

**Tech Stack:** Next.js middleware/route handlers, PostgreSQL rate-limit store ou provider edge quando disponível, HMAC-SHA256, Playwright/Vitest.

**Spec:** `docs/SECURITY_PRIVACY.md` e `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- Paciente continua sem login/senha no MVP.
- Rate limiting nunca persiste IP bruto; identificador de rede é HMAC com secret server-only e janela curta.
- Erros públicos não revelam se pessoa/agendamento/documento específico existe.
- Raw capability token nunca aparece em log, analytics, referrer ou URL final após exchange.
- State-changing requests exigem same-origin/origin validation e capability válida.

---

### Task 1: Security headers e noindex

**Files:**
- Create: `src/platform/security/headers.ts`
- Modify: `next.config.ts`
- Modify: `src/app/(protected)/layout.tsx`
- Modify: `src/app/(capability)/layout.tsx`
- Create: `src/app/robots.ts`
- Test: `tests/e2e/security-headers.spec.ts`

**Interfaces:**
- Produces conjunto central de headers por ambiente/rota.

- [ ] **Step 1: Definir baseline**

Configurar `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` mínima e proteção contra framing via `frame-ancestors 'none'`. HSTS somente em production HTTPS.

- [ ] **Step 2: CSP**

Começar restritiva: `default-src 'self'`; liberar somente origens realmente necessárias por diretiva. Não usar `*`. Inline scripts/styles só seguem mecanismo exigido pelo Next.js e devem ser revisados; provider externo não ganha acesso global por conveniência.

- [ ] **Step 3: Noindex**

Área autenticada e páginas capability devem emitir metadata/robots `noindex,nofollow`; `robots.ts` bloqueia crawling do app, sem depender disso como controle de acesso.

- [ ] **Step 4: E2E**

Verificar headers nas rotas de login, área protegida, `/c/<token>` e página capability limpa.

- [ ] **Step 5: Commit**

```bash
git add src/platform/security src/app next.config.ts tests/e2e/security-headers.spec.ts
git commit -m "feat: add web security headers and noindex"
```

---

### Task 2: Origin/CSRF protection para capability actions

**Files:**
- Create: `src/platform/security/origin.ts`
- Create: `src/platform/security/action-token.ts`
- Create: `src/platform/security/public-action.ts`
- Modify: `src/modules/forms/application/save-draft.ts`
- Modify: `src/modules/forms/application/submit-form.ts`
- Modify: `src/modules/signatures/application/sign-submission.ts`
- Modify: `src/modules/appointments/application/respond-to-confirmation.ts`
- Test: `src/platform/security/origin.test.ts`
- Test: `src/platform/security/action-token.test.ts`
- Test: `tests/e2e/capability-csrf.spec.ts`

**Interfaces:**
- Produces `requireTrustedOrigin(request)`.
- Produces `issuePublicActionToken({ capabilitySessionId, purpose, subjectId })` e `consumePublicActionToken(...)`.
- Produces `PublicActionContext` que os quatro use-cases públicos acima exigem para mutações iniciadas pelo paciente.

- [ ] **Step 1: Origin allowlist**

Permitir somente `APP_URL` e origins de preview explicitamente verificadas no environment atual. Ausência/Origin inválida em mutação browser-facing falha de modo seguro.

- [ ] **Step 2: Cookies**

Capability session cookie permanece `HttpOnly`, `Secure` em HTTPS, `SameSite=Lax` ou mais restritivo quando fluxo permitir, path/TTL mínimos.

- [ ] **Step 3: PublicActionContext**

`public-action.ts` combina sessão capability validada, Origin aprovado e nonce de ação. `saveDraft`, `submitForm`, `signSubmission` e `respondToConfirmation` recebem esse contexto quando chamados pelo fluxo público e rejeitam contexto ausente/incompatível antes de qualquer escrita.

- [ ] **Step 4: Anti-replay de ação**

Para ações finais como assinar/cancelar, usar nonce/action token one-time vinculado à capability session, finalidade e subject. Retry idempotente da mesma operação já concluída retorna resultado existente; o token consumido não autoriza outra ação/finalidade.

- [ ] **Step 5: E2E negativo**

POST cross-origin, nonce de outra capability, nonce reaproveitado para outra finalidade, subject divergente e cookie ausente devem falhar sem alterar estado.

- [ ] **Step 6: Commit**

```bash
git add src/platform/security src/modules/forms/application src/modules/signatures/application src/modules/appointments/application tests/e2e/capability-csrf.spec.ts
git commit -m "feat: protect public capability mutations"
```

---

### Task 3: Rate limiting privacy-safe

**Files:**
- Create: `supabase/migrations/20260824006200_public_rate_limits.sql`
- Create: `supabase/tests/062_public_rate_limits.sql`
- Create: `src/platform/security/rate-limit.ts`
- Modify: `src/platform/env/schema.ts`
- Modify: `src/platform/env/schema.test.ts`
- Modify: `.env.example`
- Test: `src/platform/security/rate-limit.test.ts`

**Interfaces:**
- Produces `consumeRateLimit({ scope, subjectKey, limit, windowSeconds }): RateLimitResult`.
- Produces server-only `RATE_LIMIT_HMAC_KEY` validada como secret de alta entropia e diferente por ambiente.

- [ ] **Step 1: Registrar secret e validação**

Adicionar `RATE_LIMIT_HMAC_KEY` ao server env e `.env.example` apenas como placeholder sintético. Em staging/production, exigir valor aleatório de pelo menos 32 bytes equivalente; nunca prefixar `NEXT_PUBLIC_`. Registrar a secret sem valor em `docs/operations/SECRETS.md` quando esse documento existir.

- [ ] **Step 2: Derivar chave sem IP bruto**

Quando IP estiver disponível, calcular `HMAC-SHA256(RATE_LIMIT_HMAC_KEY, normalized-network-identifier)` no servidor. Combinar com scope; não armazenar header/IP original.

- [ ] **Step 3: Scopes iniciais**

`capability_exchange`, `public_form_save`, `appointment_response`, `signature_submit`, `webhook_invalid_signature`. Limites devem ser conservadores e configuráveis; não bloquear preenchimento normal por idoso em rede instável.

- [ ] **Step 4: Implementar store atômico**

Postgres function/table com janela curta e upsert/lock atômico; registros expiram/limpam por cron. Se provider edge/WAF confiável estiver disponível, pode complementar, nunca ser única autorização.

- [ ] **Step 5: Resposta**

Exceder limite retorna 429 genérico e `Retry-After`; não informa se capability seria válida.

- [ ] **Step 6: Testes**

N requests dentro do limite passam; N+1 falha; outra scope/subjectKey permanece independente; nenhum row contém IP bruto. Env test rejeita chave curta e qualquer tentativa de expô-la em client env.

- [ ] **Step 7: Commit**

```bash
git add supabase src/platform/security src/platform/env .env.example
git commit -m "feat: add privacy safe public rate limiting"
```

---

### Task 4: Limites de request, uploads e erros públicos

**Files:**
- Create: `src/platform/security/request-limits.ts`
- Create: `src/platform/security/public-error.ts`
- Test: `src/platform/security/request-limits.test.ts`
- Test: `tests/e2e/public-error-disclosure.spec.ts`

**Interfaces:**
- Produces limites centralizados por endpoint e `PublicSafeError`.

- [ ] **Step 1: Body size**

Definir limites explícitos para JSON/form submissions e assinatura desenhada; rejeitar payload excessivo antes de processamento caro.

- [ ] **Step 2: Uploads**

Quando formulário permitir anexos, aceitar somente MIME/extension allowlist definida pelo template, validar magic bytes server-side, tamanho máximo e path opaco. Arquivos não são servidos publicamente.

- [ ] **Step 3: Erro não enumerável**

Capability inválida, expirada, revogada ou vinculada a outro subject retorna experiência genérica equivalente; detalhes específicos ficam somente em audit/log sanitizado.

- [ ] **Step 4: Testar disclosure**

Comparar status/body das classes de capability inválida e garantir ausência de person id, appointment id, CPF, e-mail ou motivo interno.

- [ ] **Step 5: Gate completo**

Run: `npm run arch:check && npm run lint && npm run typecheck && npm run test:run && npm run supabase:test && npm run test:e2e && npm run build`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/platform/security tests/e2e
git commit -m "feat: harden public request surface"
```
