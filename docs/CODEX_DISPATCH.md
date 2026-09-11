# Codex Dispatch — Regra Operacional

**Status:** aprovado
**Data:** 2026-09-11
**Relacionado:** `docs/AGENT_EXECUTION_WORKFLOW.md`, Issue #113, PR #114

## Decisão

O ChatGPT controlador deve preferencialmente **acionar e controlar diretamente as sessões Codex** por meio da infraestrutura remota autorizada, sem exigir que o usuário abra manualmente uma sessão.

A abertura manual pelo usuário é fallback, não fluxo normal. Ela só será solicitada se existir um bloqueio real de autenticação/interatividade que não possa ser resolvido com os acessos disponíveis.

## Pré-condições para dispatch

Antes de iniciar qualquer sessão Codex:

1. a documentação e o plano da tarefa devem estar aprovados e versionados;
2. a Issue/task contract deve existir;
3. o host executor deve estar online;
4. `codex --version` deve responder no host escolhido;
5. deve existir worktree/branch exclusivo para a tarefa;
6. `cwd`, repositório, branch e SHA base devem ser registrados;
7. a sessão deve usar namespace exclusivo desta conversa/tarefa;
8. nenhum PID/shell/sessão de outro chat pode ser reutilizado;
9. o prompt de execução e o relatório final devem ser persistidos em arquivo/ledger;
10. Codex não faz merge sem comando explícito do controlador.

## Host preferencial

Usar VM remota sempre que estiver saudável e possuir o repositório/ferramentas necessários. Máquinas Windows podem ser usadas como fallback ou para tarefas que dependam especificamente delas, mas o sistema e a execução normal não devem depender de estação de trabalho pessoal.

## Cota / token / usage-limit reset

Ao iniciar uma sessão Codex, validar se a conta possui cota utilizável antes de classificar a execução como bloqueada.

Se o Codex indicar ausência de tokens/cota, `usage limit`, limite esgotado ou condição equivalente e a própria experiência oficial disponibilizar a ação **redeem usage limit reset** (ou rótulo oficial equivalente), o controlador está autorizado a acionar esse resgate/reset e repetir a sessão da mesma tarefa.

Regras:
- usar somente a opção oficial oferecida pela conta/cliente; não contornar limites por métodos não suportados;
- registrar no ledger apenas que o reset oficial foi resgatado, sem armazenar credenciais/tokens;
- depois do resgate, revalidar a disponibilidade e retomar exatamente a mesma task/worktree;
- só declarar bloqueio externo se não houver reset/resgate oficial disponível ou se a conta continuar impedida após o fluxo oficial.

## Ciclo

```text
ChatGPT seleciona tarefa
-> prepara worktree
-> valida SHA/branch
-> cria prompt/brief
-> inicia Codex CLI
-> valida cota; se necessário, resgata reset oficial disponível
-> acompanha execução
-> coleta commit e evidências
-> revisa diff e testes
-> solicita correções na mesma tarefa quando necessário
-> revisão independente em tarefas de alto risco
-> CI
-> merge controlado
-> UI visível/homologação quando aplicável
-> encerra sessão da tarefa
```

Se a sessão morrer, uma sessão substituta da **mesma tarefa** pode ser criada. A retomada ocorre pelos commits e pelo ledger, nunca por memória informal da sessão antiga.

## Evidência mínima do executor

```text
TASK=<identificador>
HOST=<host>
SESSION_NAMESPACE=<namespace>
WORKTREE=<path>
BASE_SHA=<sha>
HEAD_SHA=<sha>
RED_EVIDENCE=<comando/resultado>
GREEN_EVIDENCE=<comando/resultado>
FULL_VALIDATION=<comandos/resultados>
READY_FOR_REVIEW=true|false
```

## Separação entre implementação e homologação

A sessão Codex pode executar testes automatizados, build e verificações de código. Isso **não substitui** a homologação final realizada pelo controlador em navegador/UI visível, simulando Secretaria, Profissional e Administrador.
