# Estado da Auditoria

**Status:** NÃO APTO

Nova auditoria formal executada em 2026-09-16 segundo `EXTREME_AUDIT_PROTOCOL.md`, `AUDIT_RUNTIME_PARITY_V1.md`, a matriz de transições/dados históricos e `AUDIT_OVERLAY.md`.

## Última auditoria válida
- Data: 2026-09-16.
- Commit/SHA auditado: `441e9c340287cb7f3093ff3a66f692bb1367d482`.
- Ambiente observado: staging público `https://perception-rom-subscription-parents.trycloudflare.com`.
- Build reportado por `/api/health`: `8b14e973d1ea6a93edc171b3bfb69c67ce081af9`.
- Veredito: **NÃO APTO PARA PRODUÇÃO**.
- Confiança: muito alta.
- Stop-the-line: `AUDIT_ESCAPE` real na edição da Agenda + homologação pública executando SHA diferente do auditado + fluxo de edição presente no E2E local, mas ausente da suíte externa selecionada para homologação.

## Evidência fresca desta auditoria
- `/api/health` respondeu `ok=true`, `environment=staging` e `buildSha=8b14e973...` tanto localmente nas portas do app quanto pelo túnel público.
- O `main` auditado é `441e9c340...`; portanto o ambiente externo não executa o SHA auditado.
- O container `solange_rolla_consultorio_app_staging` foi observado saudável.
- `GET /agenda/gerenciar` sem sessão retornou `307`, consistente com proteção/autenticação e sem provar o fluxo autenticado de edição.
- O `AUDIT_ESCAPE` fornecido pelo operador mostrou, durante edição de Agenda, a tela de framework/servidor `This page couldn't load`.
- O repositório possui `tests/e2e/agenda-management.spec.ts`, que cria e reagenda consulta e clica `Salvar alterações`.
- O runtime externo de E2E é configurado para executar apenas `**/real-ui-homologation.spec.ts`; essa homologação visita/cria em `/agenda/gerenciar`, mas não exerce o mesmo caminho de edição/salvamento. Esta é a causa comprovada do falso negativo de auditoria.

## Matriz de operação e paridade
| Operação | Cobertura local | Cobertura no staging/publicado | Resultado |
| --- | --- | --- | --- |
| criar consulta | E2E local e homologação | exercitada no homologation flow | PARCIAL/PASS histórico |
| editar/reagendar consulta | `agenda-management.spec.ts` | **não presente na suíte externa selecionada** | **FAIL DE PARIDADE** |
| salvar + reload/revisita | local verifica persistência | não provado no release publicado | NÃO VALIDADO |
| falha 5xx/pageerror/requestfailed/console.error | não havia gate global suficiente | escape manual mostrou erro de servidor | **FAIL** |
| dados históricos/legados | happy path local coberto | classe do registro que falhou não isolada/reproduzida no mesmo build | NÃO VALIDADO |
| SHA -> staging | main `441e9c...` | staging `8b14e973...` | **FAIL** |
| rollback do candidato | automação existe | não executado para o SHA auditado | NÃO VALIDADO |

## Achados
### P1 — AUDIT_ESCAPE: edição da Agenda falha no ambiente utilizado pelo operador
**COMPROVADO como classe de falha.** Uma mutação real produziu tela genérica de erro. Sob a nova regra, isso bloqueia `APTO` até a causa funcional e a classe de dados/estado afetada serem reproduzidas, corrigidas e regredidas no mesmo release.

### P1 — falso negativo causado por divergência entre E2E local e E2E externo
**COMPROVADO.** O teste local contém o fluxo de `Salvar alterações`, mas a configuração externa reduz a execução a `real-ui-homologation.spec.ts`, que não cobre essa mutação. A auditoria anterior, portanto, certificou um subconjunto diferente do comportamento usado pelo operador.

### P1 — SHA auditado não é o SHA publicado
`441e9c340...` não é `8b14e973...`. O health verde do staging não certifica o candidato atual.

### P1 — gate global de erros de browser/runtime precisa ser aplicado à suíte externa
Toda homologação web deve reprovar com `5xx`, `pageerror`, `requestfailed`, `console.error` inesperado e telas de erro de framework. A ausência desse gate transversal contribuiu para o escape.

### P2 — compatibilidade histórica da Agenda não comprovada
Dados novos passam em testes, mas o registro real que disparou a falha pode representar shape/estado legado, migrado ou parcial. Pela matriz global, cada classe material deve ser exercitada antes de certificar a edição.

## Risco residual
Alto para uso operacional: existe defeito observado por usuário exatamente em uma operação de edição e a homologação vigente não testa esse fluxo no release real.

## Saída do NO-GO
1. reproduzir o registro/estado responsável pelo `AUDIT_ESCAPE` e correlacionar trace/network/log do servidor;
2. corrigir a causa funcional;
3. tornar fatal na suíte externa qualquer `5xx`, `pageerror`, `requestfailed`, `console.error` inesperado ou error boundary;
4. incluir no staging a mesma operação `editar -> salvar -> reload -> sair/voltar -> conferir persistência`, para dados novos e históricos relevantes;
5. promover o SHA candidato e provar `/api/health.buildSha == SHA`;
6. executar homologação contraditória e rollback no mesmo SHA antes de novo `APTO`.

## Regra de validade
Esta auditoria cobre o SHA `441e9c340287cb7f3093ff3a66f692bb1367d482` e o staging observado em 2026-09-16. Mudança de Agenda, schema, migrações, autenticação, deploy, workers ou protocolo de E2E exige reauditoria proporcional.