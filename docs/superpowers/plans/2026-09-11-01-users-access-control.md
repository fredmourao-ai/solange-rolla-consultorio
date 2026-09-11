# Users and Routine Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar administração de usuários com papel-base e permissões individuais por rotina, aplicando a mesma decisão na UI, servidor e banco sem permitir que um papel não clínico obtenha acesso clínico por override.

**Architecture:** O módulo `identity` continua dono de perfis, sessão e autorização. Permissões são chaves estáveis registradas em catálogo SQL/TypeScript, com defaults por `app_role` e overrides tri-state por usuário (`default`, `allow`, `deny`). O servidor recebe a lista efetiva na sessão; operações sensíveis também são protegidas no banco por `public.has_permission()` e continuam sujeitas às barreiras estruturais de papel/AAL2.

**Tech Stack:** Next.js 16.3.4, TypeScript 5.9.2, Supabase/PostgreSQL, RLS/RPC, Vitest 4.1.11, Playwright 1.62.1.

**Spec:** `docs/superpowers/specs/2026-09-11-solange-end-to-end-operational-design.md`

## Global Constraints

- Não alterar `20260824001000_identity.sql` nem qualquer migration aplicada.
- Permissão explícita `deny` vence default `allow`; ausência de override usa default do papel.
- `clinical.*` só pode ser efetivo para papel clínico elegível e AAL2 quando marcado `requires_aal2`.
- `permissions.manage` exige AAL2 e nunca pode ser delegado por um usuário que não a possua.
- Mudança de acesso gera audit event sem segredo/PII desnecessária.
- Ocultar menu é UX; autorização real deve existir no servidor e banco.
- Usuário inativo não possui permissão efetiva.
- Testes usam apenas UUIDs e identidades sintéticas.

---

### Task 1: Catálogo tipado de permissões

**Files:**
- Create: `src/modules/identity/domain/permission.ts`
- Create: `src/modules/identity/domain/permission.test.ts`
- Modify: `src/modules/identity/public.ts`

**Interfaces:**
- Produces: `APP_PERMISSIONS`, `AppPermission`, `isAppPermission(value)`, `PermissionArea`.

- [ ] **Step 1: Write the failing domain test**

```ts
import { describe, expect, it } from 'vitest'
import { APP_PERMISSIONS, isAppPermission } from './permission'

describe('permission catalog', () => {
  it('uses unique stable permission keys', () => {
    expect(new Set(APP_PERMISSIONS).size).toBe(APP_PERMISSIONS.length)
    expect(APP_PERMISSIONS).toContain('patients.update')
    expect(APP_PERMISSIONS).toContain('appointments.create')
    expect(APP_PERMISSIONS).toContain('clinical.read')
    expect(APP_PERMISSIONS).toContain('permissions.manage')
  })

  it('rejects unknown permissions', () => {
    expect(isAppPermission('appointments.create')).toBe(true)
    expect(isAppPermission('clinical.god_mode')).toBe(false)
  })
})
```

- [ ] **Step 2: Run RED**

Run:
```bash
npx vitest run src/modules/identity/domain/permission.test.ts
```
Expected: FAIL because `permission.ts` does not exist.

- [ ] **Step 3: Implement the catalog**

Create `permission.ts` with this exact initial vocabulary:

```ts
export const APP_PERMISSIONS = [
  'patients.read','patients.create','patients.update','patients.archive','patients.relationships.manage',
  'appointments.read','appointments.create','appointments.update','appointments.reschedule','appointments.cancel',
  'appointments.confirm','appointments.checkin','appointments.no_show','appointments.complete','appointments.blocks.manage',
  'clinical.read','clinical.create','clinical.supersede','clinical.attachments.manage','clinical.documents.manage',
  'forms.read','forms.send','forms.manage',
  'documents.read','documents.create','documents.send',
  'messaging.read','messaging.send','messaging.templates.manage',
  'finance.read','finance.receive','finance.adjust','finance.refund',
  'fiscal.read','fiscal.issue','fiscal.cancel',
  'events.read','events.manage',
  'reports.operational.read','reports.financial.read','reports.fiscal.read',
  'users.read','users.manage','permissions.manage','settings.manage','audit.read',
] as const

export type AppPermission = (typeof APP_PERMISSIONS)[number]
export type PermissionArea = AppPermission extends `${infer Area}.${string}` ? Area : never
export const isAppPermission = (value: string): value is AppPermission =>
  APP_PERMISSIONS.includes(value as AppPermission)
```

Export it from `src/modules/identity/public.ts`.

- [ ] **Step 4: Run GREEN and identity regression**

```bash
npx vitest run src/modules/identity/domain/permission.test.ts src/modules/identity/domain/role.test.ts src/modules/identity/application/require-role.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/identity/domain/permission.ts src/modules/identity/domain/permission.test.ts src/modules/identity/public.ts
git commit -m "feat(identity): define routine permission catalog"
```

---

### Task 2: Persist defaults and user overrides with fail-closed effective permission RPC

**Files:**
- Create: `supabase/migrations/20260911010000_staff_permissions.sql`
- Create: `supabase/tests/190_staff_permissions.sql`
- Modify: `src/platform/supabase/types.ts` only through the repository's normal generated-type workflow after reset/generation.

**Interfaces:**
- Produces SQL tables: `permission_definitions`, `role_permission_defaults`, `user_permission_overrides`.
- Produces RPC: `public.has_permission(text) -> boolean`.
- Produces RPC: `public.list_current_permissions() -> table(permission_key text)`.

- [ ] **Step 1: Write the failing pgTAP test**

The test must create synthetic auth/profile contexts and assert:

```sql
select is(public.has_permission('patients.read'), true, 'secretary receives patients.read default');
select is(public.has_permission('clinical.read'), false, 'secretary can never receive clinical.read');
select is(public.has_permission('permission.that.does.not.exist'), false, 'unknown permission fails closed');
```

It must then insert a synthetic explicit `false` override for `patients.update` and expect `false`, then an explicit `true` override for a non-clinical permission whose role default is false and expect `true`.

- [ ] **Step 2: Run RED**

```bash
npm run supabase:start
npm run supabase:reset
npm run supabase:test
```
Expected: new test FAIL because permission tables/functions do not exist.

- [ ] **Step 3: Add forward-only schema**

Migration must create:

```sql
create table public.permission_definitions (
  permission_key text primary key,
  area text not null,
  label text not null,
  clinical boolean not null default false,
  requires_aal2 boolean not null default false,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create table public.role_permission_defaults (
  role public.app_role not null,
  permission_key text not null references public.permission_definitions(permission_key) on delete restrict,
  allowed boolean not null,
  primary key (role, permission_key)
);

create table public.user_permission_overrides (
  user_id uuid not null references auth.users(id) on delete restrict,
  permission_key text not null references public.permission_definitions(permission_key) on delete restrict,
  allowed boolean not null,
  changed_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);
```

Seed every key defined in Task 1 with human labels. Mark all `clinical.*` as `clinical=true, requires_aal2=true`; mark `permissions.manage`, `users.manage`, `audit.read`, `fiscal.cancel`, `finance.refund` as `requires_aal2=true`.

Initial role defaults:
- `psychologist_owner`: allow all keys except none by default; high-risk actions still require AAL2 through definition.
- `secretary`: allow patients, appointments, forms/send/read administrative status, documents administrative read/send, messaging operational actions, finance operational read/receive, fiscal read/issue, events operational access, operational reports; deny all `clinical.*`, `permissions.manage`, `users.manage`, `audit.read`, `finance.refund`, `fiscal.cancel`, financial/fiscal global reports unless explicitly granted and structurally eligible.
- `accounting`: allow `finance.read`, `fiscal.read`, relevant financial/fiscal reports and no patient clinical/agenda mutation.

- [ ] **Step 4: Implement fail-closed SQL functions**

`public.has_permission(p_permission_key text)` must:
1. return false for missing/inactive profile;
2. return false for unknown permission;
3. return false when definition is clinical and role is not `psychologist_owner`;
4. return false when `requires_aal2` and `current_aal() <> 'aal2'`;
5. prefer explicit user override;
6. fall back to role default;
7. default false.

`public.list_current_permissions()` returns only keys for which `has_permission(key)` is true.

Both are `security definer`, with fixed `search_path`, no dynamic SQL, execution revoked from anon/public and granted only to authenticated.

- [ ] **Step 5: Protect permission tables**

Enable + force RLS. Direct writes are permitted only to an active `psychologist_owner` in AAL2. Read access to definitions is allowed to authenticated staff; overrides/default internals are not broadly exposed unless required by the admin UI. Prefer controlled RPC for the management screen in Task 4.

- [ ] **Step 6: Run GREEN**

```bash
npm run supabase:reset
npm run supabase:test
npm run migrations:check
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260911010000_staff_permissions.sql supabase/tests/190_staff_permissions.sql src/platform/supabase/types.ts
git commit -m "feat(identity): persist routine permissions"
```

---

### Task 3: Load effective permissions into StaffSession and authorize by capability

**Files:**
- Modify: `src/modules/identity/application/get-session.ts`
- Modify: `src/modules/identity/application/require-role.ts`
- Modify: `src/modules/identity/application/require-role.test.ts`
- Create: `src/modules/identity/application/require-permission.test.ts`
- Modify: `src/modules/identity/public.ts`

**Interfaces:**
- `StaffSession.permissions: readonly AppPermission[]`.
- Produces: `hasSessionPermission(session, permission): boolean`.
- Produces: `authorizeStaffPermission(session, permission, options?): StaffSession`.

- [ ] **Step 1: Write RED tests**

```ts
const secretary = {
  userId: 'user-1', role: 'secretary' as const, aal: 'aal1' as const,
  active: true, displayName: 'Secretaria', permissions: ['patients.read'] as const,
}

expect(hasSessionPermission(secretary, 'patients.read')).toBe(true)
expect(hasSessionPermission(secretary, 'patients.update')).toBe(false)
expect(() => authorizeStaffPermission(secretary, 'patients.update')).toThrow('PERMISSION_FORBIDDEN')
```

Add AAL2 test for a permission that requires an explicit `options: { aal2: true }` when used by a critical action.

- [ ] **Step 2: Run RED**

```bash
npx vitest run src/modules/identity/application/require-permission.test.ts
```
Expected: FAIL because helper/session field does not exist.

- [ ] **Step 3: Implement session permission loading**

After reading profile/AAL in `get-session.ts`, call `client.rpc('list_current_permissions')`, validate every returned key with `isAppPermission`, and return the list in `StaffSession.permissions`. Any RPC error must fail closed by returning no permissions rather than inventing role access.

Add authorization error code `PERMISSION_FORBIDDEN` and helpers:

```ts
export function hasSessionPermission(session: StaffSession | null, permission: AppPermission): boolean {
  return Boolean(session?.active && session.permissions.includes(permission))
}

export function authorizeStaffPermission(
  session: StaffSession | null,
  permission: AppPermission,
  options: { aal2?: boolean } = {},
): StaffSession {
  if (!session) throw new AuthorizationError('UNAUTHENTICATED')
  if (!session.active) throw new AuthorizationError('STAFF_INACTIVE')
  if (!session.permissions.includes(permission)) throw new AuthorizationError('PERMISSION_FORBIDDEN')
  if (options.aal2 && session.aal !== 'aal2') throw new AuthorizationError('MFA_REQUIRED')
  return session
}
```

- [ ] **Step 4: Run GREEN/regression**

```bash
npx vitest run src/modules/identity
npm run typecheck
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/identity
git commit -m "feat(identity): authorize staff by routine permission"
```

---

### Task 4: Admin RPCs and Users & Access UI

**Files:**
- Create: `supabase/migrations/20260911011000_staff_permission_admin_rpcs.sql`
- Create: `supabase/tests/191_staff_permission_admin.sql`
- Create: `src/app/(protected)/usuarios/page.tsx`
- Create: `src/app/(protected)/usuarios/[userId]/page.tsx`
- Create: `src/modules/identity/ui/user-access-editor.tsx`
- Create: `src/modules/identity/ui/user-access-editor.test.tsx`
- Modify: `src/modules/identity/public.ts`

**Interfaces:**
- RPC `list_staff_users()` returns staff identity metadata required by UI, never auth secrets.
- RPC `list_user_access(uuid)` returns catalog + role default + override + effective result.
- RPC `set_user_permission_override(uuid,text,boolean)` and `clear_user_permission_override(uuid,text)` mutate one override and emit audit event.

- [ ] **Step 1: Write RED pgTAP tests**

Tests must prove:
- owner AAL2 can list staff/access;
- secretary cannot list all users unless explicitly allowed by an eligible permission;
- secretary cannot grant herself `clinical.read`;
- unknown permission rejected;
- setting and clearing an override changes effective permission;
- audit event is written with actor/target/key/old/new, without access token/email secret.

- [ ] **Step 2: Implement RPCs**

Use fixed `search_path`, validate target exists and is active/inactive profile as appropriate, require caller `public.has_permission('permissions.manage')`, and reject any attempt to make `clinical.*` effective for a non-clinical role. Setting the caller's own `permissions.manage` to false is allowed only if another active owner remains capable of administration; otherwise reject with a stable business error to avoid lockout.

- [ ] **Step 3: Run DB GREEN**

```bash
npm run supabase:reset
npm run supabase:test
```
Expected: PASS.

- [ ] **Step 4: Write UI RED test**

```tsx
render(<UserAccessEditor user={syntheticUser} permissions={syntheticPermissions} />)
expect(screen.getByText('Pacientes')).toBeInTheDocument()
expect(screen.getByText('Agenda')).toBeInTheDocument()
expect(screen.getByText('Prontuário')).toBeInTheDocument()
expect(screen.getByRole('radio', { name: 'Negar patients.update' })).toBeInTheDocument()
```

The final implementation should use human labels in visible text; test identifiers may use permission keys only in accessible descriptions intended for test instrumentation, not normal copy.

- [ ] **Step 5: Implement pages/editor**

`/usuarios` requires `users.read`; `/usuarios/[userId]` requires `permissions.manage` + AAL2 for mutation. Group by area, show three states **Padrão / Permitir / Negar**, show resulting effective state, save one change atomically and display success/error in Portuguese.

- [ ] **Step 6: Run UI GREEN**

```bash
npx vitest run src/modules/identity/ui/user-access-editor.test.tsx
npm run typecheck
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase src/app/'(protected)'/usuarios src/modules/identity
git commit -m "feat(identity): add users and access administration"
```

---

### Task 5: Permission-aware navigation and server guards

**Files:**
- Modify: `src/app/(protected)/layout.tsx`
- Modify: `src/shared/ui/app-shell.tsx`
- Modify: `src/shared/ui/sidebar-nav.tsx`
- Modify: `src/shared/ui/mobile-nav.tsx`
- Create or modify tests adjacent to these components.
- Create: `tests/e2e/permissions-navigation.spec.ts`

**Interfaces:**
- `AppShell({ children, session })` receives minimal role + permission list.
- Navigation item adds `permission?: AppPermission`.

- [ ] **Step 1: Write RED component/E2E assertions**

At minimum:

```ts
await signInDemoAsSecretary(page)
await expect(page.getByRole('link', { name: 'Pacientes' })).toBeVisible()
await expect(page.getByRole('link', { name: 'Usuários e acessos' })).toHaveCount(0)
```

And a direct URL test must prove a denied user cannot load `/usuarios` simply by typing the URL.

- [ ] **Step 2: Run RED**

```bash
npm run test:e2e -- --grep "permissions-navigation"
```
Expected: FAIL before permission-aware navigation/route guard exists.

- [ ] **Step 3: Implement navigation filtering**

Pass `session.permissions` from protected layout. Every navigation item declares its required permission and filters with `hasSessionPermission`. Keep Dashboard visible to authenticated active staff. Add **Usuários e acessos** only for users with `users.read` or `permissions.manage`.

- [ ] **Step 4: Add server route guards**

Migrate routes touched by each subsequent wave from role-only checks to `authorizeStaffPermission`. Do not mass-edit all business logic in one blind patch; each later wave owns its specific routes, while `/usuarios` is fully protected here.

- [ ] **Step 5: Run GREEN**

```bash
npm run test:e2e -- --grep "permissions-navigation"
npm run lint
npm run typecheck
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/'(protected)'/layout.tsx src/shared/ui src/app/'(protected)'/usuarios tests/e2e/permissions-navigation.spec.ts
git commit -m "feat(identity): make navigation permission aware"
```

---

### Task 6: Access-control security gate

**Files:**
- Modify: `docs/SECURITY_PRIVACY.md`
- Modify: `docs/MODULE_BOUNDARIES.md` if permission contracts add a public identity dependency.
- Add/update RLS tests for every table whose policy is changed by this wave.

- [ ] **Step 1: Replace role-only RLS on core administrative tables incrementally**

For tables needed by the next waves, RLS must use `public.has_permission()` with the relevant key. Example target behavior for `people`:

```sql
using (public.has_permission('patients.read'))
with check (public.has_permission('patients.update'))
```

Keep insert/update/delete as separate policies because they use distinct permissions.

- [ ] **Step 2: Verify negative matrix**

Run database tests proving:
- deny override blocks direct database mutation even when role historically allowed it;
- hiding UI is not required for protection;
- `secretary + clinical.read override=true` still receives false/effective deny;
- inactive profile cannot act.

- [ ] **Step 3: Run complete wave gate**

```bash
npm run lint
npm run typecheck
npm run test:run
npm run arch:check
npm run modules:check
npm run migrations:check
npm run seed:check
npm run supabase:reset
npm run supabase:test
npm run test:e2e -- --grep "permission|access|usuario"
npm run build
```
Expected: every command exits 0.

- [ ] **Step 4: Commit docs/security tests**

```bash
git add docs supabase/tests src tests
git commit -m "test(identity): enforce routine permissions end to end"
```

## Wave exit criteria

Do not start Patient 360 implementation until all are true:
- owner AAL2 can manage per-user overrides from UI;
- secretary and accounting cannot acquire clinical access through an override;
- denied core action fails at server/database level;
- menu reflects effective permissions;
- audit trail records access changes;
- full wave gate passes.
