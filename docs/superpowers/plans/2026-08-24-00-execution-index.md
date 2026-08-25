# Solange Rolla Consultorio — Implementation V2 Execution Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Executar a arquitetura v2 aprovada em entregas independentes, testáveis e seguras para múltiplos agentes.

**Architecture:** Monólito modular orientado a domínio em Next.js/TypeScript, com Supabase/PostgreSQL como fonte única de verdade, RLS default-deny, filas duráveis para integrações e workers assíncronos. Cada subplano entrega software funcional e revisável sem quebrar fronteiras de módulo.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/PostgreSQL, Supabase Auth/RLS/Storage/Queues/Cron, Vercel, Vitest, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- Ler `AGENTS.md` antes de qualquer mudança.
- Uma Task Contract = uma branch/worktree = um PR.
- Nenhum agente escreve diretamente em `main` após o bootstrap.
- Dados reais de pacientes nunca entram em fixtures, logs, issues ou testes.
- Secretaria e contabilidade nunca acessam conteúdo clínico.
- Todo dado L3, inclusive respostas pré-consulta sensíveis, é criptografado no servidor antes de persistir.
- Agenda, financeiro e fiscal têm estados independentes.
- Dinheiro usa centavos inteiros; percentuais usam `numeric` explícito.
- Persistência temporal usa `timestamptz`; regras usam `America/Sao_Paulo`.
- Integrações externas são assíncronas, idempotentes e auditáveis.
- Migrations aplicadas são imutáveis; correções usam nova migration.
- Fronteiras de módulos são verificadas automaticamente no CI.
- PRs concorrentes nunca compartilham livremente o mesmo banco remoto mutável.
- Termos, políticas e tratamentos fiscais que influenciam histórico são versionados e nunca reescritos retroativamente.
- Produção começa sem dados reais e com integrações live desabilitadas até o go-live gate.

## Ordem de execução

1. `2026-08-24-01-foundation-platform.md` — scaffold, Supabase local, filas duráveis e CI base.
2. `2026-08-24-01a-platform-provisioning.md` — Supabase staging/production, Vercel e mapa de secrets isolados.
3. `2026-08-24-01b-ui-foundation.md` — tokens de marca, componentes compartilhados, app shell e formatação pt-BR.
4. `2026-08-24-01c-architecture-enforcement.md` — dependency rules, server/client guards, module contracts e schema ownership.
5. `2026-08-24-01d-environments-preview.md` — isolamento por PR, preview branches quando disponíveis e fallback staging serializado.
6. `2026-08-24-02-identity-people.md` — autenticação, MFA/RLS, perfis e cadastro único de pessoas.
7. `2026-08-24-02b-sensitive-data-security.md` — criptografia L3, auditoria append-only e storage privado.
8. `2026-08-24-03-appointments-forms-signatures.md` — agenda, política 48h, capabilities, formulários e assinatura.
9. `2026-08-24-03a-contract-terms.md` — termos/declarações versionados, aceite e vínculo com política de cobrança.
10. `2026-08-24-03b-signed-documents.md` — PDF assinado assíncrono, privado e idempotente.
11. `2026-08-24-03c-public-edge-security.md` — headers/CSP, CSRF/origin, rate limiting e erros públicos seguros.
12. `2026-08-24-04-messaging-automations.md` — WhatsApp/e-mail por adapters, outbox/inbox, confirmações e aniversários.
13. `2026-08-24-05-finance-events.md` — contas a receber/pagar, pagamentos, fluxo de caixa, eventos e participantes.
14. `2026-08-24-06-fiscal.md` — NFS-e abstraction, tratamento fiscal por origem, homologação, worker e documentos fiscais.
15. `2026-08-24-06b-clinical.md` — registro psicológico criptografado, anexos e isolamento AAL2.
16. `2026-08-24-07-reports-hardening-release.md` — dashboards, relatórios, E2E, backup/restore, privacidade operacional, segurança e release candidate.

## Paralelismo permitido

- Foundation é serial e vem primeiro.
- Platform Provisioning, UI Foundation e Architecture Enforcement podem avançar em paralelo após o scaffold mínimo.
- Environment Preview depende do inventário/provisionamento remoto necessário para detectar Branching e mapear project refs.
- Se Supabase Branching estiver disponível, cada PR usa Preview Branch isolada + seed sintético; se não estiver, cada agente usa Supabase local/CI e staging remoto é serializado.
- Identity/People vem antes de qualquer módulo que referencie pessoa ou staff.
- Sensitive Data Security vem antes de Forms e Clinical.
- Depois de Identity/People + Sensitive Security, Appointments/Forms e a base de Finance podem avançar em paralelo se não alterarem os mesmos contratos/schema.
- Contract Terms depende de Forms/Signatures e deve terminar antes de Signed Documents e da homologação da confirmação de consulta.
- Signed Documents depende de Signatures, Contract Terms e da queue `documents` criada em Foundation.
- Public Edge Security depende das capability/public routes do plano 03 e deve estar concluída antes de links públicos entrarem em homologação externa.
- Messaging depende dos contratos públicos de People/Appointments; sua homologação de confirmação depende também do snapshot de Contract Terms e dos guards públicos.
- Events depende de People e Receivables, não de Clinical.
- Fiscal depende de People + Receivables e usa provider mock até homologação externa; falta/cancelamento ficam em revisão fiscal até tratamento explícito ser aprovado.
- Clinical depende de Identity + People + Appointments + Sensitive Data Security e exige revisão de segurança separada.
- Reports só começa depois de read models estáveis dos módulos que agrega.

## Gates entre fases

Cada plano só é considerado concluído quando:
- testes específicos passam;
- `npm run arch:check`, `npm run modules:check` e `npm run migrations:check` passam após existirem;
- `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run supabase:test` e `npm run build` passam quando aplicáveis;
- migrations sobem do zero em banco limpo;
- testes RLS negativos passam quando aplicável;
- documentação/ADR do módulo está atualizada;
- PR recebe revisão independente nas áreas críticas.

## Estratégia de branches

Use `feat/<issue>-<slug>` para features, `fix/<issue>-<slug>` para correções e `docs/<issue>-<slug>` para documentação. Cada agente trabalha em worktree isolada quando há execução paralela.

## Handoff obrigatório

Todo PR deve registrar: objetivo, arquivos alterados, migrations, novas variáveis, testes executados, riscos, decisões e dependências para o próximo agente.
