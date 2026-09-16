# Política Universal de Auditoria

Esta política é obrigatória para qualquer agente humano ou automatizado que trabalhe neste repositório.

**Versão global:** `2026-09-16-historical-state-transition-v2`

## Regra permanente
Nenhuma implementação, feature, release ou projeto pode ser declarado concluído apenas porque código foi escrito, build passou ou testes ficaram verdes. Antes da conclusão, devem ser validados comportamento, regressões, integrações afetadas, dados, estados, rotinas automáticas e riscos operacionais pertinentes.

## Quando a auditoria extrema é obrigatória
Execute integralmente `docs/quality/EXTREME_AUDIT_PROTOCOL.md` quando houver qualquer uma destas condições:
- projeto, módulo ou release declarado "pronto", "finalizado", "100%", "apto para produção" ou equivalente;
- solicitação explícita de auditoria, validação completa, revisão extrema ou investigação sistêmica;
- mudança material em autenticação/autorização, schema, regras financeiras, máquina de estados, multi-tenant, integrações externas, workers, filas, cron/scheduler, infraestrutura, deploy, backup/restore ou regras críticas de negócio;
- incidente relevante, regressão sistêmica ou evidência de divergência entre código e produção.

## Matriz de transições de estado e dados históricos
A **matriz de transições de estado e dados históricos** é obrigatória para qualquer fluxo persistido ou stateful. A auditoria deve cruzar, conforme aplicável:

1. **Operação/transição:** criar, ler, no-op update, editar um campo, editar múltiplos campos, cancelar, reabrir, arquivar, restaurar, retry, undo e toda transição de domínio existente.
2. **Proveniência/forma do dado:** dado novo no formato atual, legado/pré-migração, migrado/backfill, parcialmente preenchido/null-edge, snapshot/política/evento versionado, estado intermediário e estado terminal.
3. **Superfície de execução:** para rotina usada por operador/usuário, a mutação deve ocorrer pela UI real do produto. API, SQL, scripts, chamadas diretas de action e testes unitários/integrados servem como apoio, não substituem a prova pela UI.
4. **Pós-condição:** verificar persistência, histórico/audit log, estados dependentes, efeitos externos, idempotência/retry quando aplicável e confirmar o resultado após recarregar/reabrir a tela.

Antes de marcar um fluxo como coberto, inventarie no ambiente alvo as classes materiais de estado, versão, nullabilidade e formato histórico realmente existentes. Se uma classe material existe mas não foi exercitada, registre `NÃO VALIDADO`; não a omita nem infira sucesso a partir de seed atual.

Quando código atual consome JSON persistido, snapshot de política, payload de evento ou estrutura histórica versionada, prove uma destas garantias: (a) todos os registros históricos foram migrados/backfilled e a invariável foi verificada; ou (b) leitores/editores normalizam explicitamente as versões históricas suportadas antes de aplicar a lógica atual. Type cast não é evidência de compatibilidade.

Qualquer mutação operacional que produza 5xx, tela genérica de erro, `This page couldn’t load`, blank state ou error boundary bloqueia `APTO` até causa raiz, classe de dados afetada, correção e regressão serem comprovadas.

## Princípios
1. O protocolo é piso mínimo, nunca teto. Crie novas categorias de investigação quando o domínio ou as evidências exigirem.
2. Diferencie sempre `COMPROVADO`, `INFERIDO`, `HIPÓTESE A VALIDAR` e `NÃO VALIDADO`.
3. Procure não apenas código incorreto, mas também rotinas ausentes, estados sem saída, produtor sem consumidor, consumidor sem produtor, dados sem reconciliação e operações sem recuperação.
4. Não declare 100% auditado se qualquer área crítica permanecer não validada.
5. Toda auditoria deve estar ligada a um commit/release identificável. Mudança material posterior invalida a cobertura correspondente.
6. Achados críticos devem ser reproduzidos e, quando seguro/autorizado, corrigidos, testados, regredidos e reauditados.
7. Produção só é considerada validada quando houver evidência de que o artefato/release auditado é o que realmente está executando.
8. Não faça mudança destrutiva apenas para satisfazer a auditoria; classifique a correção como SAFE, REVIEW, MIGRATION ou DESTRUCTIVE.
9. Happy path em dados recém-criados não certifica compatibilidade histórica nem cobertura de transições.

## Estado e domínio
- Atualize `docs/quality/AUDIT_STATUS.md` ao concluir uma auditoria formal.
- Leia `docs/quality/AUDIT_OVERLAY.md` para regras específicas deste projeto.

## Prompt curto de ativação
Use:

> Execute integralmente `docs/quality/EXTREME_AUDIT_PROTOCOL.md` e `docs/quality/AUDIT_OVERLAY.md`. Assuma as lentes Auditor + Consultor + Operador. Não limite a investigação às alterações recentes. Reconstrua o sistema real, inventarie classes de dados atuais/legados/migrados, execute a matriz de transições pela UI real quando aplicável, verifique persistência após reload/reopen, procure bugs e rotinas ausentes, valide dados/produção, corrija o que for seguro, execute regressão e só conclua após o Gate Final de Completude. Diferencie COMPROVADO, INFERIDO, HIPÓTESE A VALIDAR e NÃO VALIDADO.
