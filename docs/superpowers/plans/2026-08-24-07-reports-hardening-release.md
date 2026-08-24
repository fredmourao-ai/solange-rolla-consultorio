# Reports, Hardening and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar dashboards/relatórios seguros e provar, por testes e operação, que o sistema pode ser homologado e promovido a produção sem dados reais durante o desenvolvimento.

**Architecture:** `reports` consome read models públicos dos domínios administrativos/financeiros/fiscais e nunca depende de `clinical`. Hardening combina testes automáticos, restore drill, observabilidade, acessibilidade e checklist humano antes da produção.

**Tech Stack:** PostgreSQL views/read models, Next.js, TypeScript, Vitest, Playwright, axe accessibility checks, GitHub Actions, Vercel, Supabase backups/logs.

**Spec:** `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- Reports não importa `src/modules/clinical`.
- Nenhum dashboard contém respostas de formulário sensível.
- Totais financeiros derivam das tabelas de lançamento, não de campos editáveis manualmente.
- Production deploy exige checklist e backup/restore validados.
- Dados de homologação são sintéticos e claramente identificados.

---

### Task 1: Dashboard “Atenção hoje”

**Files:**
- Create: `src/modules/reports/application/get-attention-items.ts`
- Create: `src/modules/reports/domain/attention-item.ts`
- Create: `src/modules/reports/ui/attention-dashboard.tsx`
- Create: `src/modules/reports/public.ts`
- Create: `src/modules/reports/README.md`
- Create: `src/app/(protected)/page.tsx`
- Test: `src/modules/reports/application/get-attention-items.test.ts`

**Interfaces:**
- Produces `AttentionItem { kind, severity, entityId, title, dueAt?, actionHref }`.

- [ ] **Step 1: Testar agregação sem Clinical**

Fixture inclui consulta sem confirmação, formulário pendente, assinatura pendente, recebível vencido, payable vencendo, NFS-e pendente, reagendamento e aniversário. Esperar um item de cada tipo e nenhum conteúdo clínico.

- [ ] **Step 2: Implementar queries por contratos públicos/read views**

Não importar repositories internos de módulos. Cada módulo expõe query/read model mínimo em `public.ts`.

- [ ] **Step 3: Prioridade**

`critical`: falha de segurança/fiscal definitiva; `high`: pagamentos vencidos/reagendamento; `normal`: formulários, confirmações, aniversário. Prioridade é operacional e configurável, não diagnóstico clínico.

- [ ] **Step 4: UI**

Cards simples com contagem e ação direta. Não exibir logs técnicos na tela principal.

- [ ] **Step 5: Commit**

```bash
git add src/modules/reports src/app/'(protected)'/page.tsx
 git commit -m "feat: add daily attention dashboard"
```

---

### Task 2: Relatórios e exportações

**Files:**
- Create: `src/modules/reports/application/get-financial-report.ts`
- Create: `src/modules/reports/application/get-appointments-report.ts`
- Create: `src/modules/reports/application/get-events-report.ts`
- Create: `src/modules/reports/application/get-fiscal-report.ts`
- Create: `src/modules/reports/application/export-csv.ts`
- Create: `src/modules/reports/application/export-xlsx.ts`
- Create: `src/modules/reports/application/export-pdf.ts`
- Create: `src/app/(protected)/relatorios/page.tsx`
- Test: `src/modules/reports/application/get-financial-report.test.ts`

**Interfaces:**
- Produces relatórios por período e timezone; exports preservam filtros e totalizadores.

- [ ] **Step 1: Testar financeiro**

Validar recebido, a receber, overdue, despesas pagas/a pagar, resultado realizado/projetado e breakdown por forma de pagamento usando centavos inteiros.

- [ ] **Step 2: Testar agenda/eventos**

Consultas: realizadas, canceladas dentro/fora, faltas. Eventos: inscritos, presentes, ausentes, recebido, pendente, despesas, resultado.

- [ ] **Step 3: Fiscal**

Listar issued/pending/failed/cancelled e pagamentos/serviços elegíveis sem documento. Não exportar secrets/protocol payload bruto.

- [ ] **Step 4: CSV/XLSX/PDF**

CSV UTF-8 com BOM opcional para Excel; XLSX com colunas tipadas; PDF somente resumo/relatório formatado. Não gerar documentos clínicos nessa camada.

- [ ] **Step 5: Teste de equivalência**

Totais exibidos na UI devem ser iguais aos totals exportados para o mesmo filtro.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reports src/app/'(protected)'/relatorios
 git commit -m "feat: add operational and financial reports"
```

---

### Task 3: Observabilidade e alertas técnicos

**Files:**
- Create: `src/platform/observability/logger.ts`
- Create: `src/platform/observability/redaction.ts`
- Create: `src/platform/observability/metrics.ts`
- Create: `src/app/api/health/route.ts`
- Test: `src/platform/observability/redaction.test.ts`
- Modify: `docs/TESTING_DEPLOYMENT.md`

**Interfaces:**
- Produces logs estruturados com `correlation_id`, `event`, `module`, `status`, sem PII sensível.
- Produces `/api/health` sem detalhes de secrets/data.

- [ ] **Step 1: Testar redaction**

Bloquear keys/patterns `cpf`, `token`, `secret`, `authorization`, `answers`, `clinical`, `notes`, e-mail/telefone completos quando desnecessários.

- [ ] **Step 2: Correlation IDs**

Toda request/worker job recebe correlation id propagado para audit/attempts; nunca usar CPF como correlation.

- [ ] **Step 3: Health**

Responder somente app version, env name e estados booleanos essenciais; não expor database URL/provider tokens.

- [ ] **Step 4: Alertas**

Definir thresholds operacionais: dead-letter >0, fiscal failed_final >0, worker backlog envelhecido, health failure, restore overdue. Destino de alerta configurado fora do código.

- [ ] **Step 5: Commit**

```bash
git add src/platform/observability src/app/api/health docs/TESTING_DEPLOYMENT.md
 git commit -m "feat: add privacy safe observability"
```

---

### Task 4: E2E dos dois fluxos canônicos

**Files:**
- Create: `tests/e2e/consultation-lifecycle.spec.ts`
- Create: `tests/e2e/event-lifecycle.spec.ts`
- Create: `tests/fixtures/synthetic-people.ts`
- Create: `tests/fixtures/synthetic-finance.ts`

**Interfaces:**
- Prova integração de módulos sem usar provider live.

- [ ] **Step 1: Fluxo consulta**

E2E: criar Pessoa -> agendar -> emitir capability -> preencher formulário -> assinar -> confirmação -> marcar realizada -> registrar pagamento -> fiscal mock issued -> verificar relatório.

- [ ] **Step 2: Fluxo falta/cancelamento**

Cobrir cancelamento dentro do deadline = sem cobrança; fora do deadline = cobrança conforme policy; no-show = cobrança; isenção manual com motivo = balance zero/ajuste auditado.

- [ ] **Step 3: Fluxo evento**

Criar evento -> inscrever Pessoa existente e nova -> registrar pagamento parcial/integral -> presença -> fiscal mock -> despesas -> resultado.

- [ ] **Step 4: Reexecutar jobs**

Executar workers/automations duas vezes e provar ausência de duplicação de mensagens, recebíveis, pagamentos e documentos fiscais.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e tests/fixtures
 git commit -m "test: cover canonical business lifecycles"
```

---

### Task 5: Segurança, acessibilidade e performance baseline

**Files:**
- Create: `tests/e2e/security-boundaries.spec.ts`
- Create: `tests/e2e/accessibility.spec.ts`
- Create: `tests/e2e/mobile-elderly-ux.spec.ts`
- Modify: `docs/SECURITY_PRIVACY.md`
- Modify: `docs/DEFINITION_OF_DONE.md`

**Interfaces:**
- Produces evidência automática de isolamento de papéis e UX mínima.

- [ ] **Step 1: Matriz de autorização**

Testar anonymous, secretary, accounting, owner AAL1, owner AAL2 contra people, appointments, finance, fiscal e clinical. Toda combinação negada deve ter teste explícito.

- [ ] **Step 2: Capability abuse**

Testar expired, revoked, wrong-purpose, other-subject, replay e token malformed. Nenhum caso deve vazar existência de outro paciente.

- [ ] **Step 3: Accessibility**

Rodar axe em login, agenda, cadastro, formulário público, confirmação e pagamento; zero violações critical/serious aceitas sem waiver documentado.

- [ ] **Step 4: UX idoso**

Viewport mobile, zoom 200%, targets de toque adequados, labels explícitos, fluxo sem senha para paciente e mensagens de erro em português claro.

- [ ] **Step 5: Performance baseline**

Medir páginas principais com dataset sintético representativo; estabelecer budgets documentados antes de produção e impedir N+1 óbvio/read models sem índice.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e docs/SECURITY_PRIVACY.md docs/DEFINITION_OF_DONE.md
 git commit -m "test: harden security and accessibility"
```

---

### Task 6: Backup, restore e disaster recovery drill

**Files:**
- Create: `docs/operations/BACKUP_RESTORE.md`
- Create: `docs/operations/INCIDENT_RESPONSE.md`
- Create: `docs/operations/ROLLBACK.md`
- Create: `scripts/verify-backup-restore.sh`

**Interfaces:**
- Produces runbook reprodutível e evidência de restore em staging isolado.

- [ ] **Step 1: Documentar objetivos**

Definir RPO/RTO operacional do MVP, responsáveis e frequência de teste. Valores devem ser aprovados antes do go-live; até lá, produção permanece bloqueada.

- [ ] **Step 2: Restore drill**

Restaurar backup/snapshot em projeto/ambiente isolado de staging, validar migrations/schema, contagens sintéticas, RLS e capacidade de login. Nunca restaurar sobre production para teste.

- [ ] **Step 3: Testar chaves**

Em restore, confirmar que envelopes L3 só decriptam quando secret version correspondente é fornecido; backup do banco sozinho não revela plaintext.

- [ ] **Step 4: Rollback app**

Documentar rollback Vercel e compatibilidade backward/forward de migrations; migration destrutiva exige expand/contract em releases distintas.

- [ ] **Step 5: Commit**

```bash
git add docs/operations scripts/verify-backup-restore.sh
 git commit -m "docs: add disaster recovery runbooks"
```

---

### Task 7: Release Candidate e go-live gate

**Files:**
- Create: `docs/operations/GO_LIVE_CHECKLIST.md`
- Create: `docs/releases/RELEASE_CANDIDATE_TEMPLATE.md`
- Modify: `docs/PROJECT_MASTER_PLAN.md`

**Interfaces:**
- Produces checklist binário de go/no-go; nenhum “parece funcionar”.

- [ ] **Step 1: Checklist técnico**

Exigir CI verde, E2E verde, DB tests, RLS matrix, secrets separados, MFA, live flags corretas, domains/TLS, health/alerts, restore drill e rollback testado.

- [ ] **Step 2: Checklist jurídico/fiscal**

Exigir textos/termos revisados, política de cancelamento aprovada, emissor fiscal confirmado, NFS-e homologada, política de privacidade e documentação LGPD revisadas.

- [ ] **Step 3: Checklist operacional**

Usuários/roles reais provisionados, treinamento, contato de suporte, export contábil validado, templates de mensagens revisados e nenhum dado sintético em produção.

- [ ] **Step 4: Security version gate**

No dia do release, consultar advisories atuais de Next.js/Node/Supabase e atualizar antes da promoção se houver patch de segurança aplicável.

- [ ] **Step 5: Rodar verificação final**

Run: `npm run lint && npm run typecheck && npm run test:run && npm run supabase:test && npm run test:e2e && npm run build`
Expected: todos exit 0; anexar logs/resumo ao PR de release.

- [ ] **Step 6: Commit**

```bash
git add docs/operations docs/releases docs/PROJECT_MASTER_PLAN.md
 git commit -m "docs: define production go live gate"
```
