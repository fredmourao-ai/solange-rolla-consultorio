# Memória operacional do projeto — agentes

Este arquivo registra decisões operacionais persistentes do projeto que devem ser reaplicadas em sessões futuras.

## Regras permanentes de execução

- O agente deve concluir tarefas de ponta a ponta; progresso parcial não é conclusão.
- Não deixar PR aplicável aberta sem motivo técnico externo comprovado.
- Não deixar Actions/checks relevantes pendentes ou falhando no SHA candidato.
- Qualquer falha de CI, review, migration, deploy, smoke ou health-check deve ser investigada, corrigida e revalidada imediatamente.
- Não abandonar alteração útil apenas localmente. Toda mudança necessária deve ser commitada, enviada, revisada, mergeada e integrada ao SHA implantado quando aplicável.
- Nenhum worktree/clone da tarefa pode terminar com `git status --porcelain=v1` sujo por trabalho necessário ao escopo.
- Depois do merge, validar o SHA exato de `main` e usar o auto-gate canônico para promover exatamente esse SHA.
- Deploy disparado não significa deploy concluído; é obrigatório validar o ambiente implantado.
- Homologação exige, conforme aplicável: migrations, workers/filas, heartbeat, preflight, smoke autenticado, fluxo funcional crítico e backup/restore.
- O Cloudflare Quick Tunnel já existente pode continuar como transporte temporário de homologação. Qualquer nova alteração estrutural de DNS, proxy, Tunnel nomeado, WAF ou TLS gerenciado por Cloudflare exige ADR aceito antes da implementação.
- Nunca expor tokens, chaves ou segredos em logs, commits ou chat.
- Nunca usar bypass para obter verde: sem `--no-verify`, `|| true`, `exit 0`, force merge ou desativação de proteção.
- Segurança clínica, RLS, MFA/AAL2, idempotência financeira/fiscal, isolamento de ambiente e feature flags live prevalecem sobre conveniência operacional.

A política normativa completa está em `docs/operations/AUTOGATE_COMPLETION_POLICY.md` e `REPOSITORY-GOVERNANCE.md`.
