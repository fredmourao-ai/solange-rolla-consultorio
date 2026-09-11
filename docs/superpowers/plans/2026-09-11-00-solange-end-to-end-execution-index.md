# Solange End-to-End Operational Recovery Implementation Plan — Execution Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Executar a recuperação operacional completa do Solange, da autorização por rotina até a homologação real de Secretaria e Profissional, sem reescrever a arquitetura existente.

**Architecture:** Monólito modular Next.js + TypeScript sobre Supabase/PostgreSQL. Cada onda produz software utilizável e testável por si só, preserva RLS/MFA/segregação clínica e só avança após gate automatizado e funcional. Alterações de schema são forward-only.

**Tech Stack:** Node 24.19.0, npm >=11.17.0, Next.js 16.3.4, React 19.2.8, TypeScript 5.9.2, Supabase JS 2.112.4, PostgreSQL/Supabase, Vitest 4.1.11, Playwright 1.62.1.

**Spec:** `docs/superpowers/specs/2026-09-11-solange-end-to-end-operational-design.md`

## Global Constraints

- Nenhuma implementação deve alterar `main` diretamente.
- Uma task de implementação deve ter branch/worktree própria e PR revisável.
- Não modificar migrations históricas; criar somente migrations forward-only.
- Manter cadastro interno único de `people`; usar **Pacientes** na UX principal.
- Conteúdo clínico exige papel clínico elegível + permissão + AAL2 + autorização servidor + RLS/RPC.
- Secretaria e contabilidade nunca recebem plaintext ou metadata clínica indevida.
- Estados de agenda, financeiro e fiscal permanecem independentes.
- Integrações externas não participam da transação principal do usuário.
- Dinheiro usa centavos inteiros; nunca ponto flutuante.
- Datas de negócio usam `America/Sao_Paulo`; persistência usa UTC/timestamptz.
- Testes usam apenas dados sintéticos.
- IDs internos, enums técnicos e códigos de erro não aparecem na UX normal.
- Toda mudança funcional usa TDD: teste falha antes, implementação mínima, teste passa, regressão.
- Validação final inclui UI visível operada como Secretaria, Profissional e Administradora.

---

## Ordem obrigatória de execução

### Onda 0 — Usuários e permissões por rotina

Plano: `docs/superpowers/plans/2026-09-11-01-users-access-control.md`

Entrega de saída:
- catálogo de permissões;
- defaults por papel;
- overrides por usuário;
- tela Usuários e Acessos;
- proteção server-side e banco;
- auditoria de alterações;
- menu começa a respeitar autorização.

Gate para próxima onda:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run arch:check
npm run modules:check
npm run migrations:check
npm run supabase:reset
npm run supabase:test
npm run test:e2e -- --grep "permissions|access"
npm run build
```

Todos devem terminar com exit 0.

### Onda 1 — Paciente 360° e navegação

Plano: `docs/superpowers/plans/2026-09-11-02-patient-360.md`

Entrega de saída:
- `Pessoas` substituído por `Pacientes` na UX;
- sidebar rolável;
- ficha 360°;
- cadastro administrativo ampliado;
- edição real e persistente;
- contatos, responsáveis e acompanhamento;
- abas condicionadas à permissão.

Gate: criar paciente sintético, editar, recarregar e comprovar valores persistidos; RLS negativo para usuário sem permissão.

### Onda 2 — Agenda profissional

Plano: `docs/superpowers/plans/2026-09-11-03-agenda-appointments.md`

Entrega de saída:
- botão Nova consulta na agenda;
- criação contextual;
- recorrência;
- reagendamento;
- bloqueios;
- conflitos;
- estados humanos;
- check-in operacional;
- ações diferenciadas por papel.

Gate: Secretaria e Profissional executam agendamento/reagendamento autorizados; usuário sem permissão recebe bloqueio real, não apenas menu oculto.

### Onda 3 — Atendimento e prontuário longitudinal

Plano: `docs/superpowers/plans/2026-09-11-04-care-clinical-history.md`

Entrega de saída:
- Iniciar atendimento diretamente da consulta;
- nenhum appointment UUID digitado;
- histórico clínico legível;
- acompanhamento terapêutico;
- evolução vinculada automaticamente;
- finalização da sessão;
- próximos passos;
- isolamento clínico comprovado.

Gate: Profissional AAL2 lê histórico e registra sessão; Secretaria observa apenas estado operacional e não recebe conteúdo clínico.

### Onda 4 — Colaboração, dashboard e integrações contextuais

Plano: `docs/superpowers/plans/2026-09-11-05-collaboration-dashboard-integrations.md`

Entrega de saída:
- tarefas Secretaria↔Profissional;
- dashboard específico por perfil;
- formulários/documentos no contexto do paciente;
- financeiro/fiscal no contexto da consulta;
- comunicações e pendências acionáveis.

Gate: handoff completo `chegou -> em atendimento -> finalizado -> retorno/pagamento` sem vazamento clínico.

### Onda 5 — Homologação, release e encerramento

Plano: `docs/superpowers/plans/2026-09-11-06-validation-release.md`

Matriz: `docs/homologacao/2026-09-11-end-to-end-acceptance-matrix.md`

Entrega de saída:
- suíte completa verde;
- CI/DB/governança verdes;
- deploy de homologação confirmado no SHA esperado;
- jornadas reais pela UI visível;
- persistência pós-refresh;
- teste negativo de permissões;
- evidências registradas;
- nenhum PR/Action de tarefa abandonado.

---

## Dependências entre ondas

```text
Onda 0 Permissões
   ↓
Onda 1 Paciente 360°
   ↓
Onda 2 Agenda
   ↓
Onda 3 Atendimento/Prontuário
   ↓
Onda 4 Colaboração/Integrações
   ↓
Onda 5 Homologação/Release
```

Permissões vêm primeiro porque todas as telas seguintes dependem de `can(permission)` no servidor e no modelo de navegação. Paciente 360° vem antes da Agenda para fornecer o contexto único do paciente. Agenda vem antes do workspace clínico porque o atendimento nasce de uma consulta concreta. Integrações contextuais vêm depois dos fluxos centrais estarem coerentes.

## Política de revisão e merge

Para cada task:

1. registrar SHA e branch base;
2. criar branch/worktree isolada;
3. escrever teste RED;
4. executar e registrar a falha esperada;
5. implementar a menor mudança coerente;
6. executar teste GREEN;
7. executar gate focal;
8. revisar diff por escopo, segurança e vazamento de dados;
9. abrir PR;
10. habilitar auto-merge quando checks obrigatórios estiverem configurados e verdes;
11. confirmar merge em `main`;
12. confirmar que a branch de tarefa não ficou como trabalho pendente relevante;
13. só então iniciar a próxima task dependente.

Se trabalho concorrente tocar o mesmo trecho, não sobrescrever. Rebase/reconciliação deve preservar ambas as intenções e repetir toda a validação afetada.

## Teste funcional mínimo por persona

### Secretaria

```text
Login -> Pacientes -> Novo paciente -> Editar paciente -> Agenda -> Nova consulta
-> Confirmar -> Paciente chegou -> observar Em atendimento -> receber Atendimento concluído
-> Agendar retorno -> Registrar pagamento/NFS-e conforme permissão
```

### Profissional

```text
Login/MFA -> Agenda -> paciente aguardando -> Abrir ficha -> consultar histórico
-> Iniciar atendimento -> registrar evolução -> finalizar -> solicitar retorno
-> confirmar que histórico foi acrescentado e próxima ação administrativa foi criada
```

### Administradora

```text
Login/MFA -> Usuários e Acessos -> criar/editar usuário -> negar uma rotina
-> login como usuário afetado -> menu/ação indisponível -> tentativa direta de URL/ação rejeitada
-> voltar como administradora -> permitir rotina -> acesso passa a funcionar
```

## Gate final do programa

Executar na revisão que será candidata a release:

```bash
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run arch:check
npm run modules:check
npm run migrations:check
npm run environment:check
npm run seed:check
npm run supabase:start
npm run supabase:reset
npm run supabase:test
npm run test:e2e
npm run build
```

Depois, no ambiente de homologação:
- confirmar SHA implantado;
- executar a matriz de aceitação inteira pela UI visível;
- recarregar/navegar novamente após cada mutação crítica para provar persistência;
- confirmar ausência de dados clínicos em perfis não clínicos;
- registrar resultado final em `docs/homologacao/`.

## Resultado esperado

Ao final, o Solange deve ser utilizável durante um dia inteiro de consultório sem exigir conhecimento da arquitetura interna. Secretaria opera pacientes, agenda e pendências; Profissional opera agenda, atendimento e histórico; Administração controla acessos por rotina; e todos os módulos adjacentes aparecem no contexto certo, com segurança e persistência comprovadas.
