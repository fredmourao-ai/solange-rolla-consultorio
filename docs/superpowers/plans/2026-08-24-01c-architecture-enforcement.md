# Architecture Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar as fronteiras multiagente em regras automáticas de CI, impedindo imports proibidos, ciclos e dependências acidentais entre módulos.

**Architecture:** Dependency rules são executáveis e vivem no repositório. `domain` é puro; `platform` não depende de módulos; módulos só consomem outro módulo por `public.ts`; `shared` não conhece regras de negócio.

**Tech Stack:** dependency-cruiser, ESLint, Node scripts, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- Regra arquitetural que só existe em documentação é insuficiente quando puder ser automatizada.
- Waiver de boundary exige ADR ou comentário explícito no PR aprovado pelo owner arquitetural.
- CI bloqueia ciclos e imports de internals entre módulos.

---

### Task 1: Dependency-cruiser e regras de camadas

**Files:**
- Create: `.dependency-cruiser.cjs`
- Modify: `package.json`
- Create: `tests/architecture/fixtures/forbidden-cross-module-import.ts`
- Create: `tests/architecture/fixtures/allowed-public-import.ts`

**Interfaces:**
- Produces script `npm run arch:check`.

- [ ] **Step 1: Definir regras**

Proibir: `domain -> app|ui|infrastructure|platform`; `platform -> modules`; `shared -> modules`; `module A -> module B/(domain|application|infrastructure|ui)`; ciclos em `src/**`.

Permitir: `app -> module/public|module/ui`; `module A -> module B/public`; infrastructure do próprio módulo -> platform.

- [ ] **Step 2: Testar fixture proibida**

Run: `npx depcruise tests/architecture/fixtures/forbidden-cross-module-import.ts --config .dependency-cruiser.cjs`
Expected: exit não zero indicando import de internal proibido.

- [ ] **Step 3: Testar fixture permitida**

Run: `npx depcruise tests/architecture/fixtures/allowed-public-import.ts --config .dependency-cruiser.cjs`
Expected: exit 0.

- [ ] **Step 4: Rodar no código real**

Run: `npm run arch:check`
Expected: zero violações.

- [ ] **Step 5: Commit**

```bash
git add .dependency-cruiser.cjs package.json package-lock.json tests/architecture
git commit -m "ci: enforce module dependency boundaries"
```

---

### Task 2: Guardrails ESLint para server/client e secrets

**Files:**
- Modify/Create: `eslint.config.mjs`
- Create: `src/platform/env/server-only.ts`
- Test: `tests/architecture/fixtures/client-imports-server-env.tsx`

**Interfaces:**
- Bloqueia server env em client components e imports diretos de Supabase SDK dentro de `domain`.

- [ ] **Step 1: Marcar server-only**

Usar mecanismo server-only do Next.js nos módulos de env/crypto privilegiados.

- [ ] **Step 2: Configurar `no-restricted-imports`**

Client components não importam `src/platform/env/server`, crypto keys ou service-role client. Domain não importa `@supabase/*`, `next/*`, UI libs ou provider SDKs.

- [ ] **Step 3: Verificar fixture negativa**

Run: `npm run lint -- tests/architecture/fixtures/client-imports-server-env.tsx`
Expected: lint error específico.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs src/platform/env tests/architecture
git commit -m "ci: block server secret boundary violations"
```

---

### Task 3: Manifesto/README obrigatório por módulo

**Files:**
- Create: `scripts/check-module-contracts.mjs`
- Create: `docs/templates/MODULE_README.md`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces `npm run modules:check`.

- [ ] **Step 1: Criar template**

Todo `src/modules/<name>` existente deve conter `README.md` com Responsabilidade, Public API, Owns, Consumes, Invariantes, Dados sensíveis e Proibições; quando exporta algo para outro módulo, deve conter `public.ts`.

- [ ] **Step 2: Implementar checker**

Script lista diretórios em `src/modules`; falha se README ausente ou se imports externos apontam para arquivos internos em vez de `public`.

- [ ] **Step 3: CI**

Adicionar `npm run arch:check && npm run modules:check` ao gate obrigatório.

- [ ] **Step 4: Commit**

```bash
git add scripts docs/templates package.json .github/workflows/ci.yml
git commit -m "ci: require explicit module contracts"
```

---

### Task 4: Regras de migration e schema ownership

**Files:**
- Create: `scripts/check-migrations.mjs`
- Create: `docs/SCHEMA_OWNERSHIP.md`
- Modify: `package.json`
- Modify: `.github/workflows/db.yml`

**Interfaces:**
- Produces `npm run migrations:check`.

- [ ] **Step 1: Documentar ownership**

Mapear prefixo/tabelas para módulos; Clinical schema pertence exclusivamente a `clinical`; alterações em tabela de outro módulo exigem Task Contract cross-module e revisão correspondente.

- [ ] **Step 2: Checker**

Validar nome monotônico `YYYYMMDDHHMMSS_description.sql`, bloquear nomes duplicados e detectar alteração de migration já presente em `main` usando diff do CI.

- [ ] **Step 3: Gate DB**

Workflow executa `migrations:check`, `supabase db reset`, `supabase test db` e geração de types; diff de types inesperado deve ser commitado ou falhar.

- [ ] **Step 4: Gate completo**

Run: `npm run arch:check && npm run modules:check && npm run migrations:check && npm run lint && npm run typecheck`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add scripts docs/SCHEMA_OWNERSHIP.md package.json .github/workflows/db.yml
git commit -m "ci: enforce schema ownership and migration history"
```
