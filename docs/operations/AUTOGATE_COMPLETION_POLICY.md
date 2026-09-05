# Política obrigatória de conclusão, merge e auto-gate

Esta política é obrigatória para agentes humanos e automatizados que alterem este repositório.

## Estado de conclusão

Uma tarefa técnica só pode terminar em um destes estados:

- **CONCLUÍDO**: mudança validada, commitada, enviada, revisada, mergeada e implantada quando aplicável, com evidência reproduzível.
- **BLOQUEADO**: existe impedimento externo real e incontornável com os acessos disponíveis. O agente deve registrar o que foi concluído, o que falta, a evidência do bloqueio, a ação externa necessária e o ponto exato de retomada.

Diagnóstico, código local, commit, PR aberta, CI parcial ou deploy iniciado são progresso, não conclusão.

## Regra de zero pendências

Antes de declarar conclusão, o agente deve verificar e zerar no escopo da tarefa:

- PRs aplicáveis abertas;
- issues técnicas relacionadas ainda abertas;
- Actions/checks `queued`, `in_progress`, `failure`, `cancelled` ou `timed_out` no SHA candidato;
- conflitos de merge;
- alterações locais não commitadas;
- commits locais não enviados;
- branches/worktrees da tarefa com trabalho útil ainda não integrado.

Nenhuma alteração útil pode ser abandonada apenas no filesystem, em stash, patch temporário, worktree, diretório de runner ou clone auxiliar.

## Falha exige correção imediata

Se lint, typecheck, testes, build, migration, E2E, review, gate, merge, deploy, smoke ou health-check falhar, o agente deve:

1. investigar a causa raiz;
2. reproduzir a falha de forma confiável quando possível;
3. corrigir a causa sem bypass de proteção;
4. repetir a validação que falhou;
5. repetir os gates subsequentes afetados;
6. continuar até verde ou bloqueio externo comprovado.

É proibido abandonar a execução após registrar apenas a falha.

## Fluxo Git obrigatório

Para qualquer mudança de código, configuração, workflow, infraestrutura ou documentação:

`issue/task contract -> branch/worktree isolado -> alteração -> testes -> commit -> working tree limpo -> push -> PR -> review -> CI/gates verdes -> merge -> verificação pós-merge`

Antes do merge e antes da conclusão, `git status --porcelain=v1` deve estar vazio no worktree da tarefa. Arquivos temporários de teste não podem entrar no commit e não podem conter trabalho necessário à solução.

## Auto-gate e deploy

Depois do merge:

1. identificar o SHA exato resultante em `main`;
2. validar os Actions desse SHA;
3. o auto-gate canônico deve promover exatamente esse SHA para o ambiente alvo autorizado;
4. migrations, workers e artefatos devem corresponder ao mesmo SHA;
5. qualquer falha do auto-gate ou deploy volta imediatamente para investigação/correção;
6. após correção, o novo SHA deve percorrer novamente os gates e o deploy;
7. a tarefa só termina quando o ambiente implantado estiver saudável e validado.

Nunca considerar um deploy concluído apenas porque a etapa de publicação foi disparada.

## Validação pós-deploy

Quando aplicável, executar no SHA implantado:

- preflight;
- smoke autenticado;
- health checks;
- migrations verificadas;
- workers/filas em execução e heartbeat atual;
- fluxo funcional crítico;
- backup e restore testável;
- verificação de domínio/DNS/TLS/Tunnel quando fizer parte do ambiente.

## Segurança

Auto-merge e auto-deploy nunca podem reduzir RLS, MFA/AAL2, isolamento clínico, idempotência financeira/fiscal, segregação de ambientes, proteção de secrets ou feature flags live.

## Regra final

**Não confundir progresso com conclusão. Enquanto houver ação executável e necessária para cumprir o escopo original, o agente deve continuar.**
