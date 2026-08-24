# Solange Rolla Consultorio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um MVP testavel para cadastro, agenda, formulario, confirmacao, financeiro, eventos e base fiscal do consultorio.

**Architecture:** Aplicacao Next.js/TypeScript com Supabase/PostgreSQL para dados, autenticacao e storage; deploy na Vercel; integracoes externas desacopladas por adaptadores. Dados clinicos permanecem segregados dos dados administrativos e financeiros.

**Tech Stack:** Next.js, TypeScript, Supabase/PostgreSQL, Vitest, Playwright, Vercel, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-24-solange-rolla-consultorio-design.md`

## Global Constraints
- Repositorio privado e independente.
- Sabado e domingo nao entram no calculo das 48 horas de cancelamento.
- Secretaria nao pode acessar conteudo clinico.
- Formulario assinado e imutavel; alteracoes geram nova versao.
- WhatsApp e email nao devem expor informacoes clinicas sensiveis.
- Estados de agenda, financeiro e fiscal sao independentes.

---

### Task 1: Fundacao do projeto
**Files:** criar scaffold Next.js, configuracao TypeScript, lint, Vitest, Playwright, `.env.example`, `src/lib/env.ts`, workflow CI.
**Interfaces:** produz ambiente local e CI capazes de rodar testes, lint e build.
- [ ] Criar app Next.js TypeScript com App Router.
- [ ] Adicionar Vitest e Playwright.
- [ ] Criar validacao central de variaveis de ambiente.
- [ ] Configurar GitHub Actions para lint, unit tests e build.
- [ ] Rodar verificacoes localmente e confirmar PASS.
- [ ] Commitar `chore: bootstrap consultorio app`.

### Task 2: Banco, autenticacao e perfis
**Files:** `supabase/migrations/001_core.sql`, `src/lib/supabase/*`, `src/features/auth/*`.
**Interfaces:** produz `profiles`, `roles`, autenticacao e politicas RLS.
- [ ] Escrever testes para acesso por papel: psicologa, secretaria, contabilidade.
- [ ] Criar schema e RLS.
- [ ] Implementar login e sessao.
- [ ] Confirmar que secretaria nao acessa dados clinicos.
- [ ] Commitar `feat: add auth roles and rls`.

### Task 3: Cadastro unico de pessoas
**Files:** migration `002_people.sql`, `src/features/people/*`.
**Interfaces:** produz Pessoa reutilizavel por paciente, participante e responsavel financeiro.
- [ ] Testar CPF, nascimento, contato, endereco fiscal e responsavel.
- [ ] Implementar CRUD e validacoes.
- [ ] Implementar busca e deduplicacao por CPF/email/telefone.
- [ ] Commitar `feat: add people registry`.

### Task 4: Agenda e regra de cancelamento
**Files:** migration `003_appointments.sql`, `src/features/appointments/*`, `src/domain/cancellation-policy.ts`.
**Interfaces:** produz consultas e `calculateCancellationDeadline()`.
- [ ] Escrever testes cobrindo quarta, segunda e fim de semana.
- [ ] Implementar calculo de 48 horas excluindo sabado e domingo.
- [ ] Criar agenda dia/semana/mes.
- [ ] Persistir politica e deadline calculado por consulta.
- [ ] Commitar `feat: add appointments and cancellation policy`.

### Task 5: Formularios e assinatura simples
**Files:** migration `004_forms.sql`, `src/features/forms/*`, `src/domain/document-hash.ts`.
**Interfaces:** produz formulario versionado, resposta imutavel, hash SHA-256 e trilha de assinatura.
- [ ] Testar versionamento e imutabilidade apos assinatura.
- [ ] Implementar link individual sem conta obrigatoria.
- [ ] Implementar nome digitado e assinatura com dedo.
- [ ] Gerar hash e evidencias de auditoria.
- [ ] Commitar `feat: add intake forms and simple signature`.

### Task 6: Comunicacao e confirmacao 24h
**Files:** migration `005_messages.sql`, `src/integrations/messaging/*`, `src/features/confirmations/*`.
**Interfaces:** produz adaptadores WhatsApp/email e estados de confirmacao.
- [ ] Criar interface `MessagingProvider` desacoplada.
- [ ] Implementar templates neutros sem dados clinicos.
- [ ] Implementar envio 24h antes com Confirmar/Reagendar/Cancelar.
- [ ] Registrar entrega, clique e resposta.
- [ ] Commitar `feat: add appointment confirmations`.

### Task 7: Contas a receber e pagamentos
**Files:** migration `006_receivables.sql`, `src/features/receivables/*`.
**Interfaces:** produz contas a receber vinculadas a consulta/evento e pagamentos multiplos.
- [ ] Testar pagamento integral, parcial, multipla forma, desconto e isencao.
- [ ] Gerar recebivel a partir da consulta.
- [ ] Separar status da agenda do status financeiro.
- [ ] Commitar `feat: add receivables and payments`.

### Task 8: Contas a pagar e fluxo de caixa
**Files:** migration `007_payables.sql`, `src/features/payables/*`, `src/features/cashflow/*`.
**Interfaces:** produz despesas avulsas/recorrentes e fluxo realizado/projetado.
- [ ] Testar recorrencia mensal e baixa de pagamento.
- [ ] Implementar categorias e comprovantes.
- [ ] Implementar dashboard mensal.
- [ ] Commitar `feat: add payables and cashflow`.

### Task 9: Eventos e participantes
**Files:** migration `008_events.sql`, `src/features/events/*`.
**Interfaces:** produz evento, inscricao, participante, presenca e financeiro do evento.
- [ ] Testar inscricao de pessoa existente e nova.
- [ ] Implementar agenda de eventos e visao combinada.
- [ ] Implementar lista de presenca e lista de espera.
- [ ] Vincular pagamentos e formularios ao participante.
- [ ] Commitar `feat: add events and participants`.

### Task 10: Fiscal/NFS-e adapter
**Files:** migration `009_fiscal.sql`, `src/integrations/nfse/*`.
**Interfaces:** produz `NfseProvider` com emissao, consulta, cancelamento e armazenamento de PDF/XML.
- [ ] Criar contrato do adaptador sem acoplar fornecedor.
- [ ] Implementar ambiente sandbox/mock para testes.
- [ ] Vincular documento fiscal ao recebimento e tomador.
- [ ] Commitar `feat: add nfse abstraction`.

### Task 11: Aniversarios e automacoes
**Files:** `src/features/automations/*`.
**Interfaces:** produz rotina diaria e preferencias de contato.
- [ ] Testar selecao de aniversariantes e opt-out.
- [ ] Implementar mensagem neutra por canal preferido.
- [ ] Registrar resultado de envio.
- [ ] Commitar `feat: add birthday automation`.

### Task 12: Area clinica segregada
**Files:** migration `010_clinical.sql`, `src/features/clinical/*`.
**Interfaces:** produz registros clinicos privados acessiveis somente a psicologa.
- [ ] Testar negacao de acesso da secretaria/contabilidade.
- [ ] Implementar registro por atendimento e anexos privados.
- [ ] Registrar auditoria de visualizacao.
- [ ] Commitar `feat: add protected clinical records`.

### Task 13: Relatorios e painel de atencao
**Files:** `src/features/dashboard/*`, `src/features/reports/*`.
**Interfaces:** produz alertas e relatorios operacionais/financeiros/fiscais/eventos.
- [ ] Implementar alertas de confirmacao, formulario, pagamento, conta, NFS-e e reagendamento.
- [ ] Implementar exportacao CSV; PDF/XLSX fica por adaptador posterior.
- [ ] Testar totais financeiros contra fixtures.
- [ ] Commitar `feat: add dashboard and reports`.

### Task 14: Hardening e homologacao
**Files:** testes E2E, docs operacionais, politicas de backup/restore.
**Interfaces:** produz release candidate apta a homologacao.
- [ ] Cobrir fluxo paciente -> consulta -> formulario -> assinatura -> pagamento -> fiscal.
- [ ] Cobrir fluxo evento -> participante -> pagamento -> presenca -> fiscal.
- [ ] Testar RLS e acessos negativos.
- [ ] Testar restore de backup em ambiente de homologacao.
- [ ] Executar checklist de seguranca e privacidade.
- [ ] Commitar `test: complete end to end hardening`.
