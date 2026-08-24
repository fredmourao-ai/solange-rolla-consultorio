# UI Foundation and Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um design system pequeno, acessível e consistente para que agentes implementem telas sem inventar novos padrões visuais ou de interação.

**Architecture:** Componentes genéricos vivem em `src/shared/ui`; componentes de negócio permanecem em seus módulos. Tokens de marca são CSS variables e o app shell é composição, sem regra de negócio. A experiência prioriza legibilidade e uso por idosos.

**Tech Stack:** Tailwind CSS, shadcn/ui/Radix primitives quando úteis, CSS variables, Lucide icons, React Testing Library, Playwright/axe.

**Spec:** `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- Não copiar código/Wix do site público; usar apenas identidade visual e conteúdo autorizado como referência.
- Nenhum módulo cria sua própria versão de Button/Input/Dialog se o shared component atende.
- Cor nunca é o único indicador de status.
- Targets de toque e tipografia devem funcionar bem em mobile e zoom 200%.

---

### Task 1: Tokens de marca e convenções visuais

**Files:**
- Create: `docs/BRAND_TOKENS.md`
- Create: `src/app/globals.css`
- Create: `src/shared/ui/README.md`
- Test: `tests/e2e/style-baseline.spec.ts`

**Interfaces:**
- Produces tokens `--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--danger`, `--success`, spacing/radius/focus.

- [ ] **Step 1: Inventariar identidade pública**

Registrar no documento apenas elementos confirmados no site oficial: nome profissional, logo/variações autorizadas, tom visual, imagens públicas que poderão ser usadas e links de origem. Não importar dados de pacientes/depoimentos como fixtures.

- [ ] **Step 2: Definir tokens sem espalhar hex**

Todos os componentes usam semantic tokens; valores físicos ficam centralizados em `globals.css`/theme.

- [ ] **Step 3: Teste de contraste/focus**

Criar página mínima e axe check; focus visible deve estar presente em links, buttons, inputs e dialogs.

- [ ] **Step 4: Commit**

```bash
git add docs/BRAND_TOKENS.md src/app/globals.css src/shared/ui tests/e2e/style-baseline.spec.ts
git commit -m "feat: add accessible brand tokens"
```

---

### Task 2: Componentes compartilhados mínimos

**Files:**
- Create: `src/shared/ui/button.tsx`
- Create: `src/shared/ui/input.tsx`
- Create: `src/shared/ui/textarea.tsx`
- Create: `src/shared/ui/select.tsx`
- Create: `src/shared/ui/checkbox.tsx`
- Create: `src/shared/ui/dialog.tsx`
- Create: `src/shared/ui/card.tsx`
- Create: `src/shared/ui/status-badge.tsx`
- Create: `src/shared/ui/form-field.tsx`
- Create: `src/shared/ui/empty-state.tsx`
- Test: `src/shared/ui/button.test.tsx`
- Test: `src/shared/ui/form-field.test.tsx`

**Interfaces:**
- Produces primitives estáveis consumidos por todos os módulos.

- [ ] **Step 1: Testar Button acessível**

```tsx
render(<Button>Confirmar</Button>)
expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
```

- [ ] **Step 2: FormField**

Label, description e error devem estar conectados por `htmlFor`/`aria-describedby`; error não depende só de cor.

- [ ] **Step 3: StatusBadge**

Recebe semantic status e sempre renderiza texto/ícone, não apenas cor.

- [ ] **Step 4: Evitar abstração excessiva**

Adicionar somente componentes usados pelo primeiro ciclo funcional; novos components entram quando houver uso real em dois contextos ou forte justificativa de consistência.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui
git commit -m "feat: add shared accessible ui primitives"
```

---

### Task 3: App shell responsivo

**Files:**
- Create: `src/shared/ui/app-shell.tsx`
- Create: `src/shared/ui/sidebar-nav.tsx`
- Create: `src/shared/ui/mobile-nav.tsx`
- Create: `src/shared/ui/page-header.tsx`
- Create: `src/app/(protected)/layout.tsx`
- Test: `tests/e2e/app-shell.spec.ts`

**Interfaces:**
- Produces navegação para Dashboard, Pessoas, Agenda, Eventos, Financeiro, Fiscal e Relatórios; Clínico aparece somente para role autorizada.

- [ ] **Step 1: Desktop/mobile**

Sidebar em desktop; navegação compacta acessível em mobile. Nenhuma funcionalidade essencial depende de hover.

- [ ] **Step 2: Role-aware nav**

Links podem ser ocultados por UX, mas segurança continua server/RLS; ocultar menu nunca substitui autorização.

- [ ] **Step 3: Testar zoom e keyboard**

Playwright em viewport mobile + zoom 200%; tab order lógico, menu abre/fecha por teclado e Escape.

- [ ] **Step 4: Commit**

```bash
git add src/shared/ui src/app/'(protected)'/layout.tsx tests/e2e/app-shell.spec.ts
git commit -m "feat: add responsive application shell"
```

---

### Task 4: Formatação pt-BR centralizada

**Files:**
- Create: `src/shared/kernel/format/date.ts`
- Create: `src/shared/kernel/format/money.ts`
- Create: `src/shared/kernel/format/phone.ts`
- Test: `src/shared/kernel/format/date.test.ts`
- Test: `src/shared/kernel/format/money.test.ts`

**Interfaces:**
- Produces `formatBusinessDateTime`, `formatBRLFromCents`, `formatPhoneBR`.

- [ ] **Step 1: Dinheiro**

```ts
expect(formatBRLFromCents(30000)).toBe('R$ 300,00')
```

- [ ] **Step 2: Datas**

Formatter recebe instante + timezone explícita; default de negócio é `America/Sao_Paulo`, nunca timezone implícita do servidor.

- [ ] **Step 3: Gate**

Run: `npm run lint && npm run typecheck && npm run test:run && npm run test:e2e && npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/shared/kernel/format
git commit -m "feat: centralize pt br formatting"
```
