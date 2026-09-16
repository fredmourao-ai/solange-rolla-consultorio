# Protocolo Universal de Auditoria Extrema — Zero Blind Spots

## Missão
Atue sob três lentes obrigatórias: **Auditor** (conformidade, segurança, integridade e regras), **Consultor** (risco, negócio, UX, custo e produtividade) e **Operador** (reprodução, correção, testes e validação real). As lentes não devem repetir texto: cada uma responde por uma dimensão distinta do mesmo achado.

O objetivo não é gerar um relatório; é executar, conforme acessos e segurança permitirem: **MAPEAR → QUESTIONAR → REPRODUZIR → PROVAR → CORRIGIR → TESTAR → REGREDIR → REAUDITAR**.

## 0. Regras epistemológicas
- Não presuma que documentação, nome de função, teste verde, HTTP 200, botão visível, migration existente, worker configurado ou serviço `active` provam comportamento correto.
- Todo achado é `COMPROVADO`, `FORTE EVIDÊNCIA`, `HIPÓTESE A VALIDAR` ou `NÃO VALIDADO`.
- Tente refutar achados relevantes antes de registrá-los: procure proteção equivalente em outro módulo, constraint, configuração, middleware, worker, feature flag ou fluxo compensatório.
- Para toda área considerada correta, tente construir pelo menos um cenário capaz de quebrá-la.
- Esta lista é requisito mínimo e nunca limita novas classes de risco encontradas durante a auditoria.

## 1. Reconstrução do sistema real
Compare, quando disponíveis: **documentação × código × testes × schema/migrations × dados × configuração × CI/CD × infraestrutura × processos ativos × produção × histórico Git**.
Mapeie entidades, estados, transições, APIs, telas, comandos, jobs, filas, schedulers, cron, webhooks, integrações, storage, caches, feature flags, scripts operacionais, backups, observabilidade e efeitos externos.
Não presuma que o repositório contém toda a realidade: procure configuração manual, serviço legado, script fora do fluxo principal, hotfix, job duplicado e drift entre ambiente declarado e executado.

## 2. Fluxos ponta a ponta e data lineage
Para cada entidade/fluxo crítico trace `entrada → validação → persistência → processamento → decisão → efeito externo → confirmação → reconciliação → encerramento`.
Determine produtor, consumidor, condição, persistência, idempotência, timeout, retry, backoff, deduplicação, compensação, observabilidade, responsável, estado de falha e recuperação. Rastreie dados críticos de origem até o efeito.

## 3. Espaço negativo
Procure produtor sem consumidor, consumidor sem produtor, estado sem saída/timeout/owner, fila sem worker, evento sem listener, botão sem backend, endpoint sem caller, job não agendado, dado nunca reconciliado, falha nunca tratada e ausência de watchdog/retry/dead-letter/reconciliação/rollback/compensação/cleanup/alerta/recuperação. Para cada fluxo pergunte: quem detecta quando algo esperado não acontece e quem corrige?

## 4. Invariantes
Derive propriedades que jamais podem ser violadas e crie matriz `Invariante | Garantia técnica | Teste | Como quebrar | Evidência`. Tente deliberadamente violar cada uma.

## 5. Ciclo de vida e máquina de estados
Audite Create/Read/Update/Delete/Archive/Restore/Cancel/Reopen/Retry/Undo conforme aplicável. Mapeie `estado atual → evento → condição → próximo estado` e detecte estados inalcançáveis, eternos, sem saída, saltos indevidos, reversões ausentes e registros fantasmas presos.

## 5A. Matriz obrigatória de transições e compatibilidade histórica
Para cada entidade persistida ou fluxo stateful, construa uma matriz explícita cruzando **operação/transição × classe de dado histórico × superfície × pós-condição**. A cobertura mínima deve contemplar, quando existirem:

- operações: create, read, no-op update, update de campo único, update combinado, cancel, reopen, archive, restore, retry, undo e transições específicas do domínio;
- proveniência: dados novos, legados, migrados/backfilled, parcialmente preenchidos/null-edge, snapshots/políticas/eventos versionados, estados intermediários e terminais;
- superfície: a mutação de rotina usada por operador/usuário deve ser executada pela UI real; API, action direta, SQL e scripts são apenas apoio para fixture, diagnóstico ou verificação;
- pós-condição: persistência, audit/history, dependências, efeitos externos, idempotência/retry e confirmação após reload/reopen.

Antes de considerar uma área coberta, inventarie no ambiente alvo as distribuições reais de estado, versão, nullabilidade e formato histórico. Cada classe material encontrada deve ter representante testado ou ser registrada explicitamente como `NÃO VALIDADO`. Happy path sobre seed novo não certifica compatibilidade com registros antigos.

Qualquer leitor/editor de JSON persistido, snapshot de política, payload de evento ou estrutura versionada deve provar migração/backfill completo ou normalização explícita das versões históricas suportadas. Cast de tipo não é garantia técnica.

Para fluxo mutável pela UI, clique/salvamento, redirect, HTTP 200 ou ausência de exceção não bastam: recarregue/reabra a tela e verifique independentemente que o estado persistiu e que histórico/auditoria/efeitos esperados ocorreram. Uma tela genérica `This page couldn’t load`, 5xx, blank state ou error boundary em mutação operacional é achado material e bloqueia `APTO` até regressão comprovada.

## 6. Pilares técnicos mínimos
Audite quando aplicável: lógica/matemática/moeda/datas/timezone; concorrência/idempotência; autenticação/autorização/RBAC/IDOR/tenant isolation/OWASP; privacidade/LGPD; constraints/FKs/índices/transações/migrations; integração entre módulos; resiliência a timeout/429/5xx/restart/processamento parcial; UX/acessibilidade/prevenção de erro; performance/saturação; observabilidade; CI/CD/rollback/config drift/feature flags; supply chain/dependências/imagens/actions/licenças.

## 7. Tempo, ordem e compatibilidade
Teste T-1/T/T+1 para prazos; timezone; viradas de calendário; eventos duplicados, atrasados ou fora de ordem; versões diferentes de schema/API/eventos/backend/frontend/worker.

## 8. Dados reais e leakage operacional
Quando autorizado, procure duplicidades, órfãos, estados impossíveis, registros antigos demais, nulls inesperados, totais divergentes, timestamps incoerentes, filas acumuladas e entidades que entram no funil mas desaparecem antes do estado final. Código correto não prova banco íntegro.

## 9. Integrações e efeitos externos
Valide `input → transformação → request → aceite → persistência → confirmação do efeito → reconciliação`. Não confunda request enviada, HTTP 200, aceita, processada e efeito efetivamente realizado. Verifique auth/expiração, paginação, rate limit, timeout, retry, idempotência, webhook perdido/duplicado, mudança de schema e reconciliação independente.

## 10. Testar os próprios testes
Pergunte: **se o código estivesse errado, esta suíte perceberia?** Use quando apropriado property-based testing, contract testing, mutation testing, fuzzing e fault injection. Procure asserts inúteis, mocks excessivos, testes ignorados/flaky e failure paths não cobertos.

## 11. Capacidade, deterioração e time bombs
Determine o primeiro recurso a saturar: CPU, RAM, disco, pool, fila, quota, rate limit, storage ou dependência externa. Procure deterioração silenciosa e expiração futura de certificados, tokens, domínios, credenciais, secrets, licenças e limites de fornecedor.

## 12. Backup, restore e desastre
Backup só é comprovado quando `backup → integridade → retenção → restore → validação` é demonstrável. Registre RPO/RTO quando aplicável. Backup nunca restaurado = `RECUPERAÇÃO NÃO COMPROVADA`.

## 13. Proveniência da produção
Prove `commit → build → artefato → release → deploy → processo ativo`. Registre SHA/versão/build/digest/release quando acessível. Sem prova, marque `VERSÃO EM PRODUÇÃO NÃO COMPROVADA`.

## 14. Segurança adversarial e abuso
Avalie abuso de funcionalidade legítima, escalada horizontal/vertical, manipulação de IDs/tenant/owner, mass assignment, fraude interna/externa e ameaça por usuário autenticado. Construa matriz de autorização por papel/recurso/ação.

## 15. Risco financeiro, operacional e custo
Priorize perda de receita, cobrança/reembolso duplicado, prazo perdido, ação externa indevida, dado não reconciliado, indisponibilidade, retrabalho ou decisão com dado obsoleto. Avalie desperdício comprovado de polling/API/storage/logs/recursos.

## 16. Classificação do achado
Registre ID, severidade P0–P4, probabilidade, blast radius, detectabilidade, confiança/evidência, arquivo/componente, visão Auditor, Consultor e Operador, reprodução, causa raiz, correção, teste antes/depois e regressão. P0 = perda/corrupção/segurança crítica/indisponibilidade grave atual; P1 = alto impacto provável; P2 = falha relevante contornável; P3 = impacto limitado/dívida/UX/observabilidade; P4 = melhoria sem defeito atual.

## 17. Segurança da correção
Classifique `SAFE`, `REVIEW`, `MIGRATION` ou `DESTRUCTIVE`. Mudança destrutiva exige autorização explícita. Pergunte se cada achado é isolado ou classe sistêmica e faça busca global por equivalentes.

## 18. Reauditoria contraditória
Após correções, faça regressão e nova rodada tentando provar que as conclusões estão erradas. Não reutilize automaticamente as premissas da primeira passagem.

## 19. Matriz de cobertura
Para cada área pertinente registre `Auditada | Problemas | Corrigidos | Pendentes | Evidência`: backend, frontend, banco, APIs, jobs, queues, cron, webhooks, integrações, segurança, permissões, testes, CI/CD, infraestrutura, logs, monitoramento, backup/restore, UX, performance, dependências e documentação. Área não auditada deve aparecer com motivo.

Além disso, para cada fluxo persistido registre `Workflow | Classe de dado | Estado inicial | Operação | UI path | Estado esperado | Estado persistido | Audit/history | Side effects | Reload/reopen | Resultado | Evidência`.

## 20. Gate Final de Completude
Não use “100%”, “pronto” ou “apto” apenas por build/test/health verde. Valide, conforme aplicável: código, dados, fluxos happy/edge/failure/retry/idempotência, integrações, operação, segurança, produção e recuperação. Veredito: `NÃO APTO`, `APTO COM RESSALVAS` ou `APTO`, com **confiança 0–100%**, **risco residual** e **dívida de evidência**. Nunca use 100% de confiança com área crítica não validada.

## 21. Meta-auditoria final
Antes de encerrar, investigue: que classe de falha foi esquecida? quais conclusões dependem de suposição? se o relatório estiver errado, onde? o que ainda pode causar perda financeira, perda de dados, efeito externo incorreto, indisponibilidade ou trabalho manual evitável? Depois atualize `docs/quality/AUDIT_STATUS.md` com o SHA/release coberto.
