# Solange Rolla — Multi-Agent Architecture Design

## Status

Design arquitetural consolidado em 2026-08-24 a partir dos requisitos funcionais e operacionais definidos para o novo sistema.

A especificação normativa completa está em:

- `docs/ARCHITECTURE.md`
- `AGENTS.md`
- `docs/AGENT_OPERATING_MODEL.md`
- `docs/MODULE_BOUNDARIES.md`
- `docs/DEFINITION_OF_DONE.md`
- `docs/adr/`

## Objetivo

Construir um sistema privado de consultório e eventos para Solange Rolla que seja seguro para dados sensíveis, simples para pacientes (inclusive idosos), confiável em financeiro/fiscal e estruturado para múltiplos agentes trabalharem de forma independente.

## Decisão principal

Adotar **monólito modular orientado a domínio**, Next.js/TypeScript, Supabase/PostgreSQL em São Paulo, RLS/MFA, storage privado e processamento assíncrono com filas Postgres-native/cron.

Microserviços, event sourcing e brokers externos não fazem parte do MVP.

## Domínios

- identity
- people
- appointments
- forms
- signatures
- messaging
- receivables
- payables
- events
- fiscal
- clinical
- automations
- reports
- audit

Cada domínio possui owner, contrato público e responsabilidade única.

## Invariantes críticas

- cadastro de Pessoa é único para paciente/participante/responsável;
- secretaria/contabilidade nunca acessam conteúdo clínico;
- staff usa MFA em produção;
- RLS é default-deny;
- formulário assinado é imutável;
- dinheiro não usa float;
- agenda, financeiro e fiscal têm estados independentes;
- política inicial de cancelamento usa 48 horas computáveis, sábado/domingo excluídos;
- política e deadline ficam persistidos por consulta;
- mensagens não expõem dados clínicos;
- integração externa é idempotente e, quando relevante, assíncrona;
- produção não recebe testes nem dados sintéticos misturados a dados reais.

## Fluxo paciente

```text
Pessoa -> Agendamento -> Capability Link -> Formulário -> Assinatura
       -> Confirmação 24h -> Atendimento -> Recebível -> Pagamento -> Fiscal
```

## Fluxo evento

```text
Evento -> Inscrição -> Pessoa -> Formulário opcional -> Pagamento
       -> Presença -> Fiscal -> Resultado financeiro
```

## Processamento assíncrono

```text
Business transaction -> durable queue -> worker -> provider
Provider webhook -> inbox deduplicada -> queue -> processor
```

Filas iniciais: `messaging`, `fiscal`, `documents`, `automations`.

## Modelo multiagente

Uma unidade de trabalho = uma GitHub Issue no formato Task Contract.

Uma task = uma branch/worktree = um PR.

Agentes podem trabalhar em paralelo somente quando não alteram o mesmo contrato público/schema compartilhado.

Mudanças estruturais exigem ADR.

## Segurança

Dados classificados em níveis L0 a L4. Conteúdo clínico é L3 e recebe controles reforçados. Secrets são L4 e nunca entram no repositório.

Pacientes não precisam criar conta; acessos públicos usam capability tokens com escopo mínimo, hash persistido, expiração/revogação e troca por cookie seguro.

## Entrega

Ambientes separados:

```text
local -> staging -> production
```

GitHub CI deve proteger `main` após o bootstrap inicial. Produção usa backup automático e restauração testada; PITR pode ser habilitado sem alterar arquitetura.

## Critério arquitetural de sucesso

Um agente novo deve conseguir implementar uma task lendo somente as regras globais, README/contratos do módulo e a Task Contract, sem precisar recuperar decisões de conversas anteriores.

## Próximo passo após revisão desta spec

Gerar um novo plano de implementação detalhado alinhado à arquitetura v2 e iniciar Task 1 (bootstrap/CI) em branch isolada.
