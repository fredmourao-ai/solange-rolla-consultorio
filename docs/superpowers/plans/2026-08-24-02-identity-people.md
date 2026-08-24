# Identity and People Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar autenticação interna segura, papéis/RLS default-deny e cadastro único de Pessoa reutilizado por paciente, participante, responsável e tomador fiscal.

**Architecture:** Supabase Auth autentica staff; autorização é reforçada por RLS no banco e checagem AAL2 para ações sensíveis. O módulo `people` expõe apenas contratos públicos e normaliza CPF, telefone e e-mail sem acoplar-se a agenda/financeiro.

**Tech Stack:** Supabase Auth, PostgreSQL RLS/pgTAP, Next.js Server Actions, TypeScript, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- Papéis iniciais: `psychologist_owner`, `secretary`, `accounting`.
- Clinical nunca é acessível por secretary/accounting.
- `service_role` não pode ser usado em fluxo iniciado por usuário.
- CPF/telefone/e-mail devem ser normalizados antes de persistir.
- Pessoa é única; papéis de negócio são relacionamentos, não cadastros duplicados.

---

### Task 1: Perfis, papéis e helpers de autorização

**Files:**
- Create: `supabase/migrations/20260824001000_identity.sql`
- Create: `supabase/tests/010_identity_rls.sql`
- Create: `src/modules/identity/domain/role.ts`
- Create: `src/modules/identity/public.ts`
- Create: `src/modules/identity/README.md`
- Test: `src/modules/identity/domain/role.test.ts`

**Interfaces:**
- Produces `AppRole = 'psychologist_owner' | 'secretary' | 'accounting'`.
- Produces SQL helpers `public.current_app_role()` and `public.current_aal()`.
- Produces table `public.profiles(user_id uuid primary key references auth.users, role, display_name, active, created_at, updated_at)`.

- [ ] **Step 1: Testar roles TypeScript**

```ts
import { describe, expect, it } from 'vitest'
import { isAppRole } from './role'

describe('isAppRole', () => {
  it('accepts only supported roles', () => {
    expect(isAppRole('psychologist_owner')).toBe(true)
    expect(isAppRole('secretary')).toBe(true)
    expect(isAppRole('accounting')).toBe(true)
    expect(isAppRole('admin')).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test -- src/modules/identity/domain/role.test.ts`
Expected: FAIL porque `isAppRole` não existe.

- [ ] **Step 3: Implementar role mínimo**

```ts
export const APP_ROLES = ['psychologist_owner', 'secretary', 'accounting'] as const
export type AppRole = (typeof APP_ROLES)[number]
export const isAppRole = (value: string): value is AppRole => APP_ROLES.includes(value as AppRole)
```

- [ ] **Step 4: Criar migration com RLS default-deny**

A migration deve criar `profiles`, ativar RLS e políticas que permitam ao usuário ler seu próprio perfil; somente `psychologist_owner` ativo em AAL2 pode criar/desativar outros perfis.

- [ ] **Step 5: Escrever pgTAP de autorização**

Testar explicitamente: usuário anônimo não lê profiles; secretary lê somente o próprio; accounting lê somente o próprio; owner AAL2 pode administrar perfis; owner AAL1 não pode administrar.

- [ ] **Step 6: Rodar DB tests**

Run: `npm run supabase:reset && npm run supabase:test`
Expected: todos os testes identity PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase src/modules/identity
 git commit -m "feat: add staff roles and rls helpers"
```

---

### Task 2: Login, sessão e MFA obrigatório em produção

**Files:**
- Create: `src/modules/identity/application/get-session.ts`
- Create: `src/modules/identity/application/require-role.ts`
- Create: `src/modules/identity/ui/login-form.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(protected)/layout.tsx`
- Create: `src/platform/supabase/middleware.ts`
- Modify: `src/modules/identity/public.ts`
- Test: `src/modules/identity/application/require-role.test.ts`

**Interfaces:**
- Produces `requireRole(allowed: AppRole[], options?: { aal2?: boolean })`.
- Produces `getStaffSession()` sem expor tokens ao client.

- [ ] **Step 1: Testar role/AAL**

```ts
it('rejects an allowed role when aal2 is required but session is aal1', async () => {
  await expect(requireRoleForTest({ role: 'psychologist_owner', aal: 'aal1' }, ['psychologist_owner'], true))
    .rejects.toThrow('MFA_REQUIRED')
})
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test -- src/modules/identity/application/require-role.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar use-case sem SDK no domain**

`require-role.ts` recebe sessão normalizada da camada platform; domain não importa Supabase.

- [ ] **Step 4: Implementar login e guard do layout**

Usuário sem sessão é redirecionado para `/login`; perfil inativo é bloqueado; em `APP_ENV=production`, rotas administrativas sensíveis exigem AAL2.

- [ ] **Step 5: Testar fluxo com Playwright**

Criar `tests/e2e/auth.spec.ts` usando usuários sintéticos do seed: anonymous -> login; secretary -> dashboard; owner AAL1 -> tela de MFA ao tentar configuração sensível.

- [ ] **Step 6: Commit**

```bash
git add src tests/e2e/auth.spec.ts
 git commit -m "feat: add staff auth and mfa gates"
```

---

### Task 3: Schema e normalização do cadastro único de Pessoa

**Files:**
- Create: `supabase/migrations/20260824002000_people.sql`
- Create: `supabase/tests/020_people_rls.sql`
- Create: `src/modules/people/domain/person.ts`
- Create: `src/modules/people/domain/normalize.ts`
- Create: `src/modules/people/domain/cpf.ts`
- Create: `src/modules/people/public.ts`
- Create: `src/modules/people/README.md`
- Test: `src/modules/people/domain/cpf.test.ts`
- Test: `src/modules/people/domain/normalize.test.ts`

**Interfaces:**
- Produces `PersonId` branded UUID.
- Produces `normalizeEmail`, `normalizePhoneE164BR`, `normalizeCpf`, `isValidCpf`.
- Produces `people` e `person_relationships`.

- [ ] **Step 1: Escrever testes de normalização**

```ts
it('normalizes Brazilian phone to E.164', () => {
  expect(normalizePhoneE164BR('(31) 98765-4321')).toBe('+5531987654321')
})
```

Para CPF, gerar números de teste por algoritmo no próprio teste; não usar CPF de pessoa real.

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test -- src/modules/people/domain`
Expected: FAIL.

- [ ] **Step 3: Implementar funções puras**

Validação de CPF deve rejeitar tamanho incorreto, dígitos repetidos e dígitos verificadores inválidos. Telefone exige DDI 55 quando entrada é nacional.

- [ ] **Step 4: Criar migration**

`people` deve conter `civil_name`, `preferred_name`, `cpf_normalized`, `birth_date`, `email_normalized`, `phone_e164`, `preferred_channel`, `birthday_messages_enabled`, endereço fiscal estruturado e timestamps. Criar índices unique parciais para CPF e e-mail quando não nulos.

`person_relationships` deve representar `legal_guardian`, `financial_responsible`, `fiscal_taker` e impedir duplicação idêntica por constraint.

- [ ] **Step 5: RLS por papel**

Owner e secretary podem CRUD administrativo; accounting pode SELECT apenas campos necessários por view `accounting_people_view`, nunca tabela bruta quando não necessário. Anônimo não acessa.

- [ ] **Step 6: Testar RLS negativo**

Run: `npm run supabase:test`
Expected: anônimo negado; accounting não consegue SELECT direto de `people`; secretary consegue cadastrar/editar campos administrativos.

- [ ] **Step 7: Commit**

```bash
git add supabase src/modules/people
 git commit -m "feat: add single people registry"
```

---

### Task 4: Use-cases, busca e deduplicação de Pessoa

**Files:**
- Create: `src/modules/people/application/create-person.ts`
- Create: `src/modules/people/application/update-person.ts`
- Create: `src/modules/people/application/search-people.ts`
- Create: `src/modules/people/application/find-duplicates.ts`
- Create: `src/modules/people/ui/person-form.tsx`
- Create: `src/modules/people/ui/person-search.tsx`
- Create: `src/app/(protected)/pessoas/page.tsx`
- Create: `src/app/(protected)/pessoas/nova/page.tsx`
- Test: `src/modules/people/application/find-duplicates.test.ts`

**Interfaces:**
- Produces `createPerson(input): Promise<Result<Person, PersonError>>`.
- Produces `findPotentialDuplicates({ cpf, email, phone }): DuplicateCandidate[]`.
- Consumers devem importar de `src/modules/people/public.ts`.

- [ ] **Step 1: Testar precedência de deduplicação**

```ts
it('treats same normalized CPF as a hard duplicate', () => {
  expect(matchDuplicate(existing, incoming)).toEqual({ kind: 'hard', reason: 'cpf' })
})
```

- [ ] **Step 2: Implementar regra**

CPF igual = bloqueio até usuário escolher registro existente; e-mail/telefone igual = warning com opção de continuar se CPF distinto/ausente.

- [ ] **Step 3: Implementar formulário**

Campos obrigatórios para cadastro básico: nome civil, data de nascimento, telefone ou e-mail. Dados fiscais podem ficar incompletos, mas o UI mostra `Cadastro fiscal incompleto — NFS-e não pode ser emitida`.

- [ ] **Step 4: Testar permissão UI/server**

Secretary cria/edita pessoa; accounting não abre edição; owner possui acesso completo administrativo.

- [ ] **Step 5: Rodar suite completa do plano**

Run: `npm run lint && npm run typecheck && npm run test:run && npm run supabase:test && npm run build`
Expected: exit 0 em todos.

- [ ] **Step 6: Commit**

```bash
git add src/modules/people src/app
 git commit -m "feat: add people workflows and duplicate protection"
```
