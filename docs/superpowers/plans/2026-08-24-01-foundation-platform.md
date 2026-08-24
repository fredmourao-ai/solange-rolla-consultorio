# Foundation and Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um scaffold reproduzível, CI obrigatório, Supabase local/staging e contratos básicos de plataforma antes de qualquer regra de negócio.

**Architecture:** Next.js App Router + TypeScript em monólito modular. Supabase/PostgreSQL é a fonte de verdade; a aplicação usa adapters em `src/platform` e módulos não importam SDKs diretamente. Filas PGMQ são plataforma compartilhada e existem antes dos domínios que as consomem.

**Tech Stack:** Node.js 24.19.0 LTS; Next.js 16.2.11 Active LTS; TypeScript strict; Supabase CLI 2.115.0; Vitest; Playwright; ESLint; GitHub Actions; Vercel.

**Spec:** `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- `AGENTS.md` e `docs/ARCHITECTURE.md` são normativos.
- Não usar Next.js 16.3 em produção antes da atualização de segurança anunciada para 2026-08-26 ser avaliada.
- Nenhum secret real no repositório.
- Local, staging e production usam projetos Supabase distintos.
- CI deve falhar em lint, typecheck, unit test, migration test ou build.
- Filas são infraestrutura; domínio consome `QueuePort`, nunca PGMQ diretamente.

---

### Task 1: Bootstrap Next.js e estrutura modular

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `.nvmrc`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/shared/kernel/result.ts`
- Create: `src/platform/README.md`
- Create: `src/modules/README.md`
- Test: `src/shared/kernel/result.test.ts`

**Interfaces:**
- Produces `Result<T,E>` como tipo compartilhado universal.
- Produces diretórios `app`, `modules`, `platform`, `shared` sem dependências circulares.

- [ ] **Step 1: Criar teste falhando para `Result`**

```ts
import { describe, expect, it } from 'vitest'
import { err, ok } from './result'

describe('Result', () => {
  it('represents success and failure explicitly', () => {
    expect(ok('x')).toEqual({ ok: true, value: 'x' })
    expect(err('bad')).toEqual({ ok: false, error: 'bad' })
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `npm test -- src/shared/kernel/result.test.ts`
Expected: FAIL porque `./result` ainda não existe.

- [ ] **Step 3: Implementar `Result` mínimo**

```ts
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })
```

- [ ] **Step 4: Configurar scripts obrigatórios**

`package.json` deve expor exatamente: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:run`, `test:e2e`, `supabase:start`, `supabase:stop`, `supabase:reset`, `supabase:test`.

- [ ] **Step 5: Verificar scaffold**

Run: `npm run lint && npm run typecheck && npm run test:run && npm run build`
Expected: todos exit code 0.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .nvmrc tsconfig.json next.config.ts src
git commit -m "chore: bootstrap modular next app"
```

---

### Task 2: Variáveis de ambiente tipadas e isolamento de secrets

**Files:**
- Create: `.env.example`
- Create: `src/platform/env/schema.ts`
- Create: `src/platform/env/server.ts`
- Create: `src/platform/env/client.ts`
- Test: `src/platform/env/schema.test.ts`

**Interfaces:**
- Produces `serverEnv` apenas para código server-side.
- Produces `clientEnv` somente com variáveis prefixadas `NEXT_PUBLIC_`.

- [ ] **Step 1: Testar rejeição de env inválida**

```ts
it('rejects missing server secrets', () => {
  expect(() => parseServerEnv({})).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
})
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test -- src/platform/env/schema.test.ts`
Expected: FAIL porque `parseServerEnv` não existe.

- [ ] **Step 3: Implementar schema com Zod**

O schema deve validar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `APP_ENV`, `CLINICAL_ENCRYPTION_KEY_V1`, e feature flags `WHATSAPP_LIVE_ENABLED`/`NFSE_LIVE_ENABLED` como booleanos explícitos.

- [ ] **Step 4: Criar `.env.example` sem valores reais**

O arquivo contém apenas nomes e valores sintéticos como `https://example.supabase.co` e `replace-me`; nunca tokens reais.

- [ ] **Step 5: Verificar que client bundle não importa server env**

Run: `npm run build`
Expected: build concluído sem exposição de variáveis server-only.

- [ ] **Step 6: Commit**

```bash
git add .env.example src/platform/env
git commit -m "chore: add typed environment contracts"
```

---

### Task 3: Supabase local, migrations baseline e testes de banco

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/20260824000100_extensions.sql`
- Create: `supabase/tests/000_smoke.sql`
- Create: `supabase/seed.sql`
- Create: `src/platform/supabase/server.ts`
- Create: `src/platform/supabase/browser.ts`
- Create: `src/platform/supabase/types.ts` (gerado)

**Interfaces:**
- Produces clientes Supabase separados server/browser.
- Produces baseline com extensões necessárias e nenhum schema de domínio ainda.

- [ ] **Step 1: Inicializar Supabase CLI 2.115.0**

Run: `npx supabase@2.115.0 init`
Expected: `supabase/config.toml` criado.

- [ ] **Step 2: Criar teste SQL smoke**

```sql
begin;
select plan(1);
select ok(current_setting('server_version_num')::int > 0, 'postgres is running');
select * from finish();
rollback;
```

- [ ] **Step 3: Subir stack e confirmar teste**

Run: `npm run supabase:start && npm run supabase:reset && npm run supabase:test`
Expected: 1 teste PASS, zero falhas.

- [ ] **Step 4: Gerar types**

Run: `npx supabase gen types typescript --local > src/platform/supabase/types.ts`
Expected: arquivo TypeScript válido.

- [ ] **Step 5: Validar banco limpo**

Run: `npx supabase db reset`
Expected: migrations e seed aplicados sem erro a partir de banco vazio.

- [ ] **Step 6: Commit**

```bash
git add supabase src/platform/supabase package.json package-lock.json
git commit -m "chore: add local supabase platform"
```

---

### Task 4: Filas duráveis e contrato de jobs

**Files:**
- Create: `supabase/migrations/20260824000200_queues.sql`
- Create: `supabase/tests/002_queues.sql`
- Create: `src/platform/queue/types.ts`
- Create: `src/platform/queue/queue.ts`
- Create: `src/platform/queue/supabase-queue.ts`
- Test: `src/platform/queue/queue.test.ts`

**Interfaces:**
- Produces `QueuePort<T>` com `send`, `read`, `archive` e `fail/requeue` conforme adapter.
- Produces queues `messaging`, `automations`, `documents`, `fiscal`.

- [ ] **Step 1: Escrever teste do contrato**

```ts
it('preserves the application idempotency key in queued jobs', async () => {
  const id = await queue.send({ kind: 'documents.render', idempotencyKey: 'doc:123', payload: { id: '123' } })
  const [job] = await queue.read(1)
  expect(job.id).toBe(id)
  expect(job.message.idempotencyKey).toBe('doc:123')
})
```

- [ ] **Step 2: Criar migration de filas**

Habilitar extensão/recursos PGMQ suportados e criar exatamente as quatro filas. Reexecutar migration/reset não pode criar duplicações nem falhar por queue já existente.

- [ ] **Step 3: Restringir acesso**

Browser/anon não possuem permissão direta nas filas. Workers usam credencial/runtime server-side específico e contratos mínimos.

- [ ] **Step 4: Implementar adapter**

Payload comum inclui `kind`, `idempotencyKey`, `correlationId`, `payload`, `createdAt`. Domain modules dependem de `QueuePort`, não de Supabase.

- [ ] **Step 5: Testar redelivery**

Ler job sem archive e simular término do visibility timeout; job deve voltar a ser elegível e preservar idempotency key.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260824000200_queues.sql supabase/tests/002_queues.sql src/platform/queue
git commit -m "feat: add durable platform queues"
```

---

### Task 5: CI, preview e proteção de main

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/db.yml`
- Create: `.github/dependabot.yml`
- Modify: `docs/TESTING_DEPLOYMENT.md`
- Test: `.github/workflows/*` via PR run

**Interfaces:**
- Produces checks `lint`, `typecheck`, `unit`, `db`, `build`.
- Produces base para branch ruleset exigir esses checks.

- [ ] **Step 1: Criar workflow CI**

Jobs separados devem executar `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:run` e `npm run build` em Node 24.19.0.

- [ ] **Step 2: Criar workflow DB**

O job instala Supabase CLI pinada em 2.115.0, sobe a stack, executa `supabase db reset` e `supabase test db`.

- [ ] **Step 3: Configurar Dependabot**

Atualizações npm e GitHub Actions semanais, máximo 5 PRs abertos por ecossistema.

- [ ] **Step 4: Abrir PR e validar checks reais**

Expected: todos os checks obrigatórios ficam verdes em execução limpa.

- [ ] **Step 5: Ativar ruleset de `main` somente após checks existirem**

Exigir PR, checks `lint`, `typecheck`, `unit`, `db`, `build`, bloquear force-push e deleção. CODEOWNERS deve ser respeitado nas áreas já mapeadas.

- [ ] **Step 6: Security gate antes de produção**

No dia de qualquer deploy de produção, verificar a versão suportada de Next.js e aplicar o patch de segurança vigente; nunca promover uma versão com advisory crítico aberto.

- [ ] **Step 7: Commit**

```bash
git add .github docs/TESTING_DEPLOYMENT.md
git commit -m "ci: enforce platform quality gates"
```
