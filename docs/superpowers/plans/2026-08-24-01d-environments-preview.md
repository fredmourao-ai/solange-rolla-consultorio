# Isolated Environments and Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que agentes e PRs concorrentes nunca compartilhem inadvertidamente o mesmo banco de desenvolvimento nem contaminem staging/production.

**Architecture:** Local e CI são sempre isolados via Supabase CLI. Quando Supabase Branching estiver disponível no plano contratado, cada PR usa Preview Branch própria e Vercel Preview correspondente. Sem Branching, staging remoto é ambiente de integração serializado, nunca sandbox concorrente de agentes.

**Tech Stack:** Supabase CLI, Supabase Branching quando disponível, Vercel Preview, GitHub Actions, synthetic seed.

**Spec:** `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- Production nunca é usada para desenvolvimento, preview ou teste.
- Staging remoto não recebe migrations concorrentes de múltiplos PRs.
- Preview/local usa somente dados sintéticos.
- Nenhum clone automático de dados reais de production para preview.
- Secrets de preview/staging/production são distintos.
- Branch de banco é efêmera e descartável; migration files continuam sendo a fonte de verdade.

---

### Task 1: Política de ambientes e seleção de modo

**Files:**
- Create: `docs/ENVIRONMENTS.md`
- Modify: `docs/TESTING_DEPLOYMENT.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Produces dois modos operacionais documentados: `preview-branch` e `local-ci-serialized-staging`.

- [ ] **Step 1: Detectar capacidade sem assumir plano**

Na configuração inicial do Supabase, verificar se Branching/Preview Branches está habilitado para o projeto. Registrar a decisão no `docs/ENVIRONMENTS.md` e no Task Contract do bootstrap.

- [ ] **Step 2: Documentar modo A — Preview Branch**

Quando disponível: cada PR que altera aplicação/schema recebe uma Supabase Preview Branch isolada, sem dados de production, populada pelo `supabase/seed.sql` sintético. A Vercel Preview do mesmo PR recebe URL/keys dessa branch.

- [ ] **Step 3: Documentar modo B — Local/CI + staging serial**

Quando Branching não estiver disponível: cada agente usa Supabase local próprio; GitHub CI sobe banco novo do zero por job; staging remoto só recebe uma integração por vez depois de PR revisado. PRs com migration não usam staging simultaneamente.

- [ ] **Step 4: Definir regra de descarte**

Preview branches são efêmeras. Encerrar/remover ao fechar/mergear PR conforme automação da plataforma; local é descartável; staging é restaurável e nunca vira fonte de migrations manuais.

- [ ] **Step 5: Commit**

```bash
git add docs/ENVIRONMENTS.md docs/TESTING_DEPLOYMENT.md AGENTS.md
git commit -m "docs: define isolated environment strategy"
```

---

### Task 2: Seed sintético determinístico

**Files:**
- Modify: `supabase/seed.sql`
- Create: `tests/fixtures/seed-manifest.json`
- Create: `scripts/verify-synthetic-seed.mjs`
- Test: `tests/integration/seed-isolation.test.ts`

**Interfaces:**
- Produces dataset sintético mínimo e reproduzível para local, CI e preview.

- [ ] **Step 1: Definir namespace de fixtures**

Todos os e-mails usam domínio reservado `example.test`; telefones usam números explicitamente sintéticos; nomes incluem marcador `Teste`; CPFs são gerados apenas para teste por algoritmo e não vêm de pessoas reais.

- [ ] **Step 2: Seed mínimo**

Criar três staff sintéticos, pessoas sintéticas, consultas, evento, recebível/payable e estados suficientes para testes de UI. Não inserir registro clínico plaintext; quando a criptografia existir, fixture clínica é criada por helper de teste.

- [ ] **Step 3: Verificador**

`verify-synthetic-seed.mjs` falha se encontrar domínios de e-mail não permitidos, telefone fora do namespace sintético, token/secret real-like ou strings proibidas configuradas.

- [ ] **Step 4: CI**

Executar verificador antes de `supabase db reset` em CI e preview bootstrap.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed.sql tests/fixtures scripts/verify-synthetic-seed.mjs
git commit -m "test: add deterministic synthetic seed"
```

---

### Task 3: Preview Branch por PR quando disponível

**Files:**
- Create: `.github/workflows/preview.yml`
- Create: `scripts/preview-env.mjs`
- Modify: `docs/ENVIRONMENTS.md`

**Interfaces:**
- Produces uma associação verificável `GitHub PR -> Vercel Preview -> Supabase Preview Branch`.

- [ ] **Step 1: Habilitar somente após confirmar suporte**

Workflow deve ser condicionado à configuração/secrets que indicam Branching disponível; ausência da capacidade não pode quebrar CI principal.

- [ ] **Step 2: Aplicar migrations da branch**

Preview parte do estado declarativo do repo e aplica migrations/seed sintético. Nenhum SQL manual fora do versionamento.

- [ ] **Step 3: Vincular Vercel Preview**

As variáveis de preview devem apontar para a branch correspondente. Verificação automática falha se `APP_ENV=preview` estiver apontando para project ref de staging/production.

- [ ] **Step 4: Smoke test**

Após deploy: `/api/health`, login sintético e uma leitura de schema esperada. Nenhum provider live habilitado.

- [ ] **Step 5: Cleanup**

Fechamento/merge de PR deve deixar preview branch elegível para remoção automática da plataforma; script nunca apaga production/staging project refs.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/preview.yml scripts/preview-env.mjs docs/ENVIRONMENTS.md
git commit -m "ci: add isolated pull request previews"
```

---

### Task 4: Fallback de staging serializado

**Files:**
- Create: `.github/workflows/staging-promote.yml`
- Create: `scripts/staging-lock.mjs`
- Modify: `docs/ENVIRONMENTS.md`

**Interfaces:**
- Produces promoção manual/serial de uma revisão para staging com concurrency group exclusivo.

- [ ] **Step 1: Concurrency lock**

GitHub Actions usa `concurrency: staging` com `cancel-in-progress: false`. Apenas uma promoção/migration de staging pode executar por vez.

- [ ] **Step 2: Origem permitida**

Promover somente commit/PR explicitamente selecionado e já aprovado. Não apontar staging para worktree local arbitrária.

- [ ] **Step 3: Reset proibido em staging compartilhado**

Workflow aplica migrations forward; `db reset` só em local/CI/preview descartável. Correções usam nova migration.

- [ ] **Step 4: Smoke/rollback**

Executar smoke após promoção. Se app falhar, rollback do deploy; se migration forward não for backward-compatible, seguir expand/contract em nova release, não restaurar silenciosamente sobre dados de staging sem runbook.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/staging-promote.yml scripts/staging-lock.mjs docs/ENVIRONMENTS.md
git commit -m "ci: serialize shared staging promotions"
```
