# Modelo de Execução — ChatGPT Coordenador + Codex Executor

**Status:** aprovado para o projeto Solange Rolla
**Data:** 2026-09-11
**Issue guarda-chuva:** #113
**PR documental:** #114

## Objetivo

Executar a recuperação e evolução do Solange com separação explícita entre coordenação arquitetural, implementação, revisão e homologação. O ChatGPT atua como controlador principal e fonte de decisão; sessões do Codex atuam como executores de tarefas delimitadas. Nenhum resultado de um executor é aceito como conclusão sem revisão independente e validação reproduzível.

## Papéis

### ChatGPT — controlador principal

Responsabilidades:
- manter specs, planos e requisitos como fonte de verdade;
- decompor o trabalho em tarefas e ondas;
- escolher ordem e dependências;
- emitir contratos exatos para cada sessão Codex;
- preservar regras de negócio, arquitetura, segurança e LGPD;
- revisar diffs e resultados de testes;
- decidir sobre conflitos entre implementação e spec;
- impedir merge de trabalho incompleto;
- acompanhar CI e governança do repositório;
- executar homologação funcional final pela UI visível;
- validar cada fluxo como Secretaria, Profissional e Administrador;
- registrar rulings/decisões duráveis no repositório/ledger quando necessário.

### Codex — executor por tarefa

Responsabilidades:
- receber uma tarefa delimitada e sua documentação;
- trabalhar somente no branch/worktree da tarefa;
- validar diretório, repositório, branch e SHA antes de mutar;
- seguir TDD: teste falhando antes, implementação mínima, teste passando;
- respeitar APIs públicas e limites dos módulos existentes;
- executar verificações especificadas;
- revisar o próprio diff;
- produzir commit(s) pequenos e coerentes;
- entregar SHA, resumo, diff relevante e evidências de teste ao controlador;
- nunca declarar a tarefa global concluída nem fazer merge por conta própria, salvo instrução expressa do controlador.

### Revisor independente

Para tarefas de alto risco — identidade/permissões, RLS, clínico, dinheiro, fiscal, migrações, segurança ou alterações transversais — deve haver uma revisão independente adicional. O revisor não implementa a primeira versão; ele procura bypass de autorização, exposição indevida, regressão, inconsistência de domínio, testes frágeis e violações da spec.

## Isolamento obrigatório

Regra operacional: **1 chat/controlador = 1 namespace CLI exclusivo; 1 tarefa Codex = 1 sessão e 1 worktree/branch próprios**.

- Não reutilizar shell, PID, REPL ou estado interativo de outra conversa.
- Uma sessão morta/travada pode ser substituída por outra sessão para a mesma tarefa.
- Sessão concluída não é reassociada a outra tarefa.
- Não encerrar processos desconhecidos pertencentes a outras conversas/agentes.
- Trabalho durável deve viver em commit, branch e ledger; nunca apenas em memória da sessão.
- Antes de qualquer mutação: confirmar `cwd`, repo, branch, SHA base e identidade da tarefa.

## Fluxo de execução por tarefa

```text
Spec aprovada
  -> plano técnico
  -> tarefa selecionada
  -> branch/worktree isolado
  -> sessão Codex dedicada
  -> RED: teste que demonstra ausência/falha
  -> implementação
  -> GREEN: teste focal passa
  -> verificações ampliadas
  -> self-review Codex
  -> revisão do ChatGPT
  -> revisão independente quando alto risco
  -> correções e re-review
  -> CI verde
  -> merge controlado
  -> smoke/homologação UI quando a tarefa produz fluxo visível
```

## Contrato enviado ao Codex

Cada dispatch deve conter, no mínimo:
- identificação da Issue/tarefa;
- spec e plano a ler primeiro;
- SHA base esperado;
- worktree/branch da tarefa;
- arquivos/módulos em escopo;
- interfaces consumidas e produzidas;
- requisitos funcionais e de segurança;
- teste RED esperado;
- comandos de validação obrigatórios;
- proibição de ampliar escopo sem ruling;
- proibição de merge direto;
- formato do relatório de saída.

Modelo de relatório do executor:

```text
TASK=<id/nome>
BASE_SHA=<sha>
HEAD_SHA=<sha>
FILES_CHANGED=<lista>
RED_EVIDENCE=<teste/comando e falha esperada>
GREEN_EVIDENCE=<teste/comando e sucesso>
FULL_VALIDATION=<comandos/resultados>
RISKS_OR_RULINGS=<nenhum ou lista>
READY_FOR_REVIEW=true|false
```

## Estratégia de paralelismo

Paralelizar somente tarefas independentes em arquivos/contratos e estado. Não executar dois Codex simultaneamente sobre o mesmo fluxo acoplado quando houver risco de colisão semântica.

Pode paralelizar, por exemplo:
- documentação isolada;
- testes de apresentação sem tocar contratos de domínio;
- read models independentes;
- tarefas de módulos distintos sem interface compartilhada.

Executar sequencialmente quando houver dependência forte:
- permissões -> navegação;
- permissões -> Paciente 360°;
- paciente/agenda -> atendimento;
- atendimento -> prontuário longitudinal;
- consulta concluída -> financeiro/fiscal contextual;
- migração produtora -> consumidores dessa migração.

## Revisão obrigatória

O ChatGPT revisa cada tarefa contra quatro eixos:

1. **Spec:** atende exatamente o comportamento acordado?
2. **Arquitetura:** respeita boundaries, contratos públicos, imutabilidade de migrations e regras históricas?
3. **Segurança:** há bypass via URL, Server Action, RPC, RLS, API ou acesso direto ao banco? Dados clínicos permanecem segregados?
4. **Produto:** Secretaria e Profissional conseguem executar a rotina real sem conhecer IDs/códigos técnicos?

Achados bloqueantes retornam para correção. Uma tarefa só avança quando todos os achados load-bearing forem corrigidos ou formalmente adjudicados contra a spec.

## Validações técnicas

Conforme o risco e os arquivos alterados, executar:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run arch:check
npm run modules:check
npm run migrations:check
npm run seed:check
npm run supabase:test
npm run test:e2e
npm run build
```

Não é necessário executar comandos irrelevantes em cada microtarefa, mas toda onda deve fechar com a matriz completa aplicável. Migração/RLS exige testes DB positivos e negativos; UI exige E2E e homologação visual; workers exigem testes de retry/idempotência quando alterados.

## Homologação real de UI

Automação de teste não substitui validação como usuário. Ao concluir cada onda funcional, repetir com dados sintéticos em navegador visível.

### Secretaria

```text
login
-> Dashboard da secretaria
-> cadastrar/editar paciente
-> agendar consulta
-> alterar/reagendar
-> confirmar
-> check-in
-> acompanhar paciente em atendimento sem conteúdo clínico
-> receber pendência pós-atendimento
-> agendar retorno
-> registrar pagamento/fiscal quando autorizado
```

### Profissional

```text
login + MFA quando necessário
-> Dashboard profissional
-> Agenda
-> abrir paciente
-> consultar histórico autorizado
-> iniciar atendimento a partir da consulta
-> registrar evolução
-> finalizar
-> criar próximos passos/tarefa para secretaria
```

### Administrador

```text
login + MFA
-> Usuários e Acessos
-> conceder/negar permissão a usuário sintético
-> login como usuário alvo
-> confirmar menu/ação condicional
-> tentar URL direta
-> tentar mutação server-side
-> confirmar bloqueio ou autorização correta
-> validar auditoria da alteração
```

## Critério de merge

Uma tarefa só pode ser mergeada quando:
- spec/task contract atendidos;
- RED/GREEN comprovados;
- validações aplicáveis verdes;
- revisão de código aprovada;
- revisão de segurança adicional concluída quando exigida;
- conflitos resolvidos;
- CI obrigatório verde;
- não existe trabalho de outro agente sobrescrito/abandonado.

PRs aprovadas devem usar auto-merge quando as regras do repositório permitirem. Nenhuma alteração aceita pode ser abandonada fora de uma branch/PR sem decisão explícita de descarte devidamente justificada.

## Ordem macro da recuperação

1. documentação integral e matriz de rastreabilidade;
2. usuários, papéis-base e permissões por rotina;
3. navegação e linguagem por permissão;
4. Paciente 360° e edição administrativa completa;
5. Agenda profissional completa;
6. atendimento iniciado a partir da consulta;
7. acompanhamento e prontuário longitudinal;
8. handoff Secretaria <-> Profissional e tarefas internas;
9. formulários/documentos/comunicação integrados ao contexto;
10. financeiro/fiscal integrados ao paciente e consulta;
11. dashboards por perfil;
12. segurança/regressão/performance/acessibilidade;
13. staging, migração, rollout e validação visível ponta a ponta.

## Estado de conclusão

A execução não termina em progresso parcial. Cada tarefa termina em `CONCLUIDA` ou `BLOQUEADA`; cada onda somente fecha após validação. O projeto somente pode ser declarado operacional quando a jornada completa de Secretaria, Profissional e Administrador tiver sido validada com dados sintéticos pela UI visível, além das verificações técnicas e de segurança.
