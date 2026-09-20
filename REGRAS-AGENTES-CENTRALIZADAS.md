# Regras centralizadas


<!-- BROWSER_SESSION_POLICY_V1 -->
<!-- GLOBAL_BROWSER_VM_POLICY_V2 -->
## Politica global de navegador, host e ciclo de vida de sessoes

Esta politica vale para todos os agentes e prevalece sobre qualquer instrucao antiga de escolher/perguntar host para navegacao.

- Qualquer navegador, sessao grafica, automacao browser, Playwright/Selenium/CDP, Chrome/Chromium/Edge/Opera, CAPTCHA, MFA, consentimento ou validacao visual deve executar por padrao e obrigatoriamente na VM backend `always-free-arm-1787907847-26` (`10.0.1.38`) usando o Browser Worker privado.
- Para intervencao humana em MFA/CAPTCHA/consentimento, usar a interface autenticada `https://shopvivaliz.com.br/admin/browser-worker.php`.
- Fred-Win (`LAPTOP-NIG4IFUU`) e `DESKTOP-KOCEPSV` sao proibidos como destino ou fallback de navegacao/browser. Nao usar relays Windows, Chrome/Edge/Opera local, Playwright/Selenium local ou CDP nesses hosts para navegacao.
- O agente nao deve perguntar qual maquina usar para browser: o destino canonico e a VM backend. Excecao somente quando o proprietario ordenar explicitamente, na tarefa atual, o uso de um Windows especifico para aquela navegacao.
- Se a VM/browser worker estiver indisponivel, reparar via OCI Bastion, tunel privado ou control plane canonico. Se houver bloqueio externo real, registrar o bloqueio; nunca fazer fallback silencioso para Windows.
- Workflows, scripts e bridges de browser que ainda apontem para Fred-Win/KOCEPSV sao legado: nao executar como caminho normal ou fallback; migrar para a VM antes do proximo uso.
- Windows continua permitido para tarefas nao-browser que dependam especificamente de Windows/hardware local; esta politica proibe seu uso para navegacao e automacao grafica/browser.
- Toda sessao invisivel/headless transitoria iniciada por agente deve ter identidade e ownership rastreaveis: execution_id ou task id, agente/origem, host, PID/process tree quando disponivel, profile/user-data-dir, started_at, expires_at e heartbeat/last_seen, sem secrets.
- TTL padrao para sessao invisivel/headless transitoria gerenciada: 2 horas. Enquanto a tarefa estiver ativa, heartbeat valido renova o TTL.
- Sessao orfa (owner/parent ausente, tarefa encerrada ou heartbeat expirado) pode ser encerrada antes das 2 horas.
- Ao concluir ou abandonar a tarefa, encerrar imediatamente navegadores, abas, processos filhos, portas CDP, locks e perfis temporarios da execucao que nao sejam mais necessarios.
- Nunca usar kill global por nome de processo. Preservar sessoes persistentes documentadas; limpeza deve ser owner-scoped.
- Antes da resposta final, verificar e limpar sessoes invisiveis, processos browser, perfis temporarios, locks ou portas CDP sem justificativa persistente.
- Esta politica nao reduz requisitos de validacao visual: quando o projeto exigir navegador real/visivel, a evidencia deve vir do Browser Worker/VM e da interface autenticada, nao de Windows.

Regra principal: **browser/navegacao sempre na VM backend; Windows nunca e fallback.**

