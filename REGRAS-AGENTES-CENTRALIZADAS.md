# Regras centralizadas


<!-- BROWSER_SESSION_POLICY_V1 -->
## Politica global de navegador, host e ciclo de vida de sessoes

Esta politica vale para todos os agentes e complementa as regras de isolamento de sessao e provenance.

- Antes de iniciar navegador, sessao grafica ou automacao browser interativa/remota em host controlado pelo usuario, se a maquina nao tiver sido indicada explicitamente na tarefa atual, perguntar qual maquina/host deve ser usado. Nao escolher automaticamente Fred-Win, KOCEPSV, VMs, Cloud Shell ou outro host. Quando aplicavel, informar a alternativa de Cloud Browser.
- Excecoes: CI/workflows com runner/host previamente fixado pelo proprio workflow e bridges/servicos persistentes cujo host esteja definido pela arquitetura nao precisam perguntar novamente; nesses casos o host ja e parte explicita do contrato da execucao.
- Toda sessao invisivel/headless transitoria iniciada por agente deve ter identidade e ownership rastreaveis: execution_id ou task id, agente/origem, host, PID/process tree quando disponivel, profile/user-data-dir, started_at, expires_at e heartbeat/last_seen, sem secrets.
- TTL padrao para sessao invisivel/headless transitoria gerenciada: 2 horas. Enquanto a tarefa estiver ativa, heartbeat valido renova o TTL. O TTL nao e motivo para matar uma sessao ativa com heartbeat recente.
- Sessao orfa (owner/parent ausente, tarefa encerrada ou heartbeat expirado) pode ser encerrada antes das 2 horas. O objetivo do TTL e limitar abandono, nao obrigar espera minima para limpar orfaos.
- Ao concluir ou abandonar a tarefa, encerrar imediatamente navegadores, abas, processos filhos, portas CDP, locks e perfis temporarios que pertencam a execucao e nao sejam mais necessarios.
- No boot/logon, janitor deterministico deve limpar apenas sessoes invisiveis transitorias/orfas e artefatos associados. Nunca usar kill global por nome de processo nem encerrar indiscriminadamente Chrome/Opera/Edge/Firefox.
- Preservar sessoes visiveis do usuario e qualquer sessao persistente/bridge explicitamente documentada. Persistencia exige owner, finalidade, mecanismo de health e cleanup proprios; nao e sessao transitoria abandonada.
- Regras antigas com timeout curto para headless (por exemplo janitor de 10 minutos) so podem atingir sessoes nao gerenciadas/orfas/temporarias sem heartbeat valido. Nao devem encerrar sessao gerenciada ativa apenas pela idade.
- Antes da resposta final, verificar se ficaram sessoes invisiveis, processos browser, perfis temporarios, locks ou portas CDP da tarefa. Se ficaram sem justificativa persistente, limpar antes de concluir.
- Esta politica nao reduz os requisitos de validacao visual: quando a regra do projeto exigir navegador real/visivel como evidencia final, screenshot headless continua insuficiente. Headless pode ser usado como automacao/preparacao quando permitido, sujeito a esta politica de ciclo de vida.

Regra principal: **nenhum navegador invisivel transitorio deve nascer sem ownership/TTL, permanecer sem heartbeat ou ser abandonado apos a tarefa; nenhuma sessao visivel/persistente deve ser morta por limpeza generica.**
