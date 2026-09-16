# Estado da Auditoria

**Status:** NÃO APTO

Nova auditoria formal executada em 2026-09-16 segundo `EXTREME_AUDIT_PROTOCOL.md`, `AUDIT_RUNTIME_PARITY_V1.md`, a matriz obrigatória de transições/dados históricos e `AUDIT_OVERLAY.md`.

## Última auditoria válida
- Data: 2026-09-16.
- Commit/SHA auditado: `b060f3a2e7978c964bef5f9c47734d65db2396b2`.
- Ambiente publicado observado: staging público `https://perception-rom-subscription-parents.trycloudflare.com`.
- Build reportado por `/api/health`: `8b14e973d1ea6a93edc171b3bfb69c67ce081af9`.
- Veredito: **NÃO APTO PARA PRODUÇÃO**.
- Confiança: muito alta para o NO-GO.
- Stop-the-line: o código que corrige a classe histórica do `AUDIT_ESCAPE` da Agenda passou local/CI, porém o staging continua executando um SHA anterior e o novo `Historical State Audit` não foi executado contra o SHA `b060f3a...` promovido; portanto a correção ainda não possui prova produção-equivalente.

## O que foi corrigido no SHA auditado
O commit `b060f3a...` é a incorporação do PR #169 e trata diretamente a classe sistêmica revelada pelo erro manual de edição da Agenda:
- adiciona normalização de snapshots históricos da política de cancelamento nos leitores operacionais de Agenda e atendimento clínico;
- adiciona regressão unitária para o formato legado persistido;
- adiciona `tests/e2e/agenda-historical-state-transitions.spec.ts`, cobrindo transições por UI com registros históricos, reload/reopen e pós-condições;
- endurece `AUDIT_POLICY.md`, `EXTREME_AUDIT_PROTOCOL.md` e `DEFINITION_OF_DONE` para exigir dados atuais, legados, migrados/backfilled, parciais e versionados;
- adiciona workflow `Historical State Audit` para executar a auditoria histórica sobre o SHA promovido exato.

## Evidência fresca desta auditoria
- O PR #169, cuja árvore de código foi incorporada em `b060f3a...`, concluiu com sucesso: `CI`, `Database`, `Repository Governance Gate` e `AI Conflict Resolver`.
- O job `CI` do PR incluiu `unit`, `architecture`, `lint`, `typecheck`, `build` e `e2e`, todos com conclusão `success`; o E2E inicializou/resetou Supabase isolado, compilou a aplicação e executou Playwright.
- No próprio SHA `b060f3a...`, o workflow `Database` por `workflow_dispatch` concluiu `success`.
- Validação focal reproduzida no SHA `b060f3a...` em clone limpo: `cancellation-policy-legacy.test.ts` + `audit-policy-governance.test.ts` = **2 arquivos / 5 testes PASS**.
- O staging público continua saudável, mas `/api/health` reporta `buildSha=8b14e973...`, não `b060f3a...`.
- Os runs `Staging Promote` e `Historical State Audit` associados a `b060f3a...` observados até esta auditoria foram `skipped`/não produziram homologação do candidato. Portanto o novo E2E histórico ainda não foi provado no ambiente publicado do mesmo SHA.

## Matriz de operação e paridade
| Operação / classe | Local/CI no código do candidato | Staging no mesmo SHA | Resultado |
| --- | --- | --- | --- |
| criar consulta atual | E2E | não revalidado em `b060f3a...` | NÃO VALIDADO NO SHA |
| editar/reagendar consulta atual | E2E | não revalidado em `b060f3a...` | NÃO VALIDADO NO SHA |
| editar registro com snapshot legado | novo E2E histórico | staging ainda em `8b14e973...` | **FAIL DE PARIDADE** |
| cancelar/cobrar com política histórica | novo E2E histórico | não executado no candidato publicado | NÃO VALIDADO NO SHA |
| reload/reopen/persistência pós-mutação | coberto pelo novo E2E histórico | não comprovado externamente no candidato | NÃO VALIDADO NO SHA |
| dados migrados/backfilled/parciais/versionados | política + E2E histórico ampliados | homologação exata ainda ausente | DÍVIDA DE EVIDÊNCIA |
| gate 5xx/pageerror/requestfailed/console.error | exigido pela política global | ainda não comprovado no ciclo externo do candidato | NÃO VALIDADO |
| SHA candidato -> staging | `b060f3a...` | `8b14e973...` | **FAIL** |
| rollback do candidato | automação existente | candidato não promovido | NÃO VALIDADO |

## Achados
### P1 — correção do AUDIT_ESCAPE ainda não foi validada no ambiente publicado do mesmo SHA
**COMPROVADO.** A classe de dados históricos que escapava foi tratada em código e testes, mas o ambiente externo permanece em `8b14e973...`. Pela regra `AUDIT_RUNTIME_PARITY_V1`, testes locais verdes não autorizam encerrar o defeito.

### P1 — divergência de proveniência continua bloqueante
`main/candidato=b060f3a...`; staging=`8b14e973...`. O health verde do staging certifica apenas o release antigo.

### P1 — Historical State Audit não executou sobre o candidato promovido
O novo workflow existe para fechar exatamente esta lacuna, porém os runs observados para `b060f3a...` foram pulados porque a promoção do candidato não ocorreu. O gate correto está implementado, mas sua evidência operacional ainda não existe.

### P2 — matriz histórica ainda precisa ser confrontada com dados equivalentes do ambiente publicado
O novo E2E cobre a classe legada com dados sintéticos controlados. Antes de `APTO`, a homologação deve confirmar as formas persistidas materialmente relevantes do banco de staging/produção-equivalente sem depender apenas de fixtures atuais.

## Causa raiz do falso negativo anterior
A auditoria antiga separava duas dimensões que precisavam ser cruzadas: **operação real** e **forma histórica do dado persistido**. O fluxo de edição/reagendamento existia em teste local, enquanto a homologação externa exercitava um subconjunto diferente; além disso, os casts/leituras aceitavam em TypeScript snapshots legados cujo shape real só se manifestava em registros antigos. O resultado foi um falso `PASS` para dados novos e um erro de servidor quando o operador editou um registro histórico.

## Risco residual
Alto para go-live até que o candidato seja promovido e a homologação histórica rode no mesmo SHA. A qualidade local melhorou significativamente e a classe do escape agora possui testes, mas a prova que faltava continua sendo justamente a execução produção-equivalente.

## Saída do NO-GO
1. concluir os gates canônicos do SHA `b060f3a...` e promovê-lo a staging;
2. provar `/api/health.buildSha == b060f3a...`;
3. executar `Historical State Audit` + homologação real no mesmo SHA, com fatal gate para `5xx`, `pageerror`, `requestfailed`, `console.error` e telas de erro;
4. exercer `editar -> salvar -> reload -> sair/voltar -> conferir persistência` para dados atuais e históricos relevantes;
5. correlacionar trace/rede/logs e confirmar nenhuma reprodução do `AUDIT_ESCAPE`;
6. executar rollback do candidato e reauditoria contraditória antes de alterar o status para `APTO`.

## Regra de validade
Esta auditoria cobre o SHA `b060f3a2e7978c964bef5f9c47734d65db2396b2` e o staging observado em 2026-09-16. Mudança material em Agenda, schema, migrações, autenticação, workers, deploy ou protocolo de E2E exige reauditoria proporcional ao risco.