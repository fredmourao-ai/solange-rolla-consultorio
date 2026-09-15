# Estado da Auditoria

**Status:** NÃO APTO

Auditoria externa/independente executada segundo `EXTREME_AUDIT_PROTOCOL.md` e `AUDIT_OVERLAY.md`, reconstruindo as evidências no repositório, GitHub Actions, VM de homologação, banco e artefatos de backup, sem aceitar o relatório anterior como conclusão.

## Última auditoria válida
- Data: 2026-09-15
- Commit/SHA de aplicação auditado: `73821512f1e50fbacc24cb80d182d3e17e4f8cf0`
- Release/ambiente comprovado: árvore local e gates do GitHub no SHA acima; homologação atualmente serve `a66af3bdf86ff6660bf0786bca666abf880796c4`, portanto **não corresponde ao SHA auditado**
- Veredito: **NÃO APTO PARA PRODUÇÃO**
- Confiança do veredito: **97%**
- Motivo de stop-the-line: proveniência/deploy de homologação divergente do `main` e ausência de prova operacional do release exato com workers em lockstep; restore de banco foi comprovado, mas rollback do release atual, objetos privados e custódia/restore de chaves externas permanecem não validados

## Evidência reproduzida no SHA auditado
- `npm run typecheck`: PASS.
- `npm run lint`: PASS com 0 erros e 2 warnings não bloqueantes de navegação interna.
- `npm run arch:check`: PASS, 478 módulos / 1071 dependências, sem violações.
- `npm run modules:check`: PASS.
- `npm run migrations:check`: PASS.
- `npm run seed:check`: PASS; seed sintético validado.
- `npm run test:run -- --reporter=verbose`: **623 PASS / 1 SKIP**, 192 arquivos PASS / 1 arquivo SKIP.
- `npm run build`: PASS em build de produção Next.js.
- `npm run supabase:reset`: PASS; migrations e seed aplicados do zero.
- `npm run supabase:test`: **50 arquivos / 559 testes pgTAP PASS**.
- E2E após reset limpo de banco e build com o mesmo ambiente do CI: **59/59 PASS** em 1 worker, incluindo Agenda, Paciente 360, financeiro, NFS-e mock, AAL2/clínico, isolamento clínico, exportações, segurança negativa, mobile/zoom e homologação operacional por UI.
- GitHub Actions no SHA exato: `CI` PASS, `Database` PASS e `Repository Governance Gate` PASS em revalidação `workflow_dispatch` do `main`.

## Evidência de ambiente implantado
- `solange-client-demo-web` está saudável e responde externamente, com `APP_ENV=staging` e providers live desligados (`WHATSAPP_LIVE_ENABLED=false`, `EMAIL_LIVE_ENABLED=false`, `NFSE_LIVE_ENABLED=false`).
- `/api/health` externo reporta `buildSha=a66af3bdf86ff6660bf0786bca666abf880796c4`.
- `main` auditado é `73821512f1e50fbacc24cb80d182d3e17e4f8cf0`.
- O workflow `Staging Promote` associado ao SHA auditado terminou `skipped`; não há evidência de promoção desse release.
- O worker de mensageria em execução usa imagem `solange-messaging-worker:485f414cd0d36a88502fc775ab354f2804832e42`; o document worker usa tag não imutável `client-ready`. Assim, proveniência e lockstep dos workers com o release atual não estão comprovados.
- Consulta agregada das filas/tabelas assíncronas não mostrou acúmulo óbvio de `document_jobs` ou `outbound_messages`, mas isso não substitui prova de versão/consumo dos workers.

## Backup e recuperação
- Último backup observado: `2026-09-14T23:09:11Z`, com dump completo e dump `public + clinical + auth`.
- SHA-256 dos dois artefatos: PASS.
- Restore isolado do artefato `public + clinical + auth`: **PASS**, `restore_success rto_seconds=7`.
- O bloqueador anterior de “restore não comprovado” está, portanto, **resolvido para o banco coberto pelo drill**.
- Ainda **NÃO VALIDADO**: backup/restore de objetos privados do Storage e custódia/recuperação das chaves externas de criptografia.
- Ainda **NÃO VALIDADO**: rollback operacional do release exato atualmente candidato, pois esse SHA não foi promovido para homologação.

## Achados materiais
### P0 — homologação não executa o SHA atual
**COMPROVADO.** O `main` auditado é `73821512...`, enquanto o ambiente externo saudável reporta `a66af3...`. A regra de aceite exige `SHA candidato == SHA implantado`; portanto resultados do ambiente atual não podem certificar o código atual.

Ação requerida: promover somente após os gates canônicos verdes, confirmar `/api/health.buildSha` igual ao candidato e executar smoke/E2E real sobre esse mesmo SHA.

### P1 — workers sem proveniência de release em lockstep
**COMPROVADO.** Mensageria executa imagem identificada por SHA anterior (`485f414...`) e o document worker usa tag `client-ready`, sem prova de correspondência ao `73821512...`.

Ação requerida: versionar workers por SHA/release imutável, promover junto do web e registrar/validar a versão em health/diagnóstico pós-deploy.

### P1 — recuperação incompleta fora do PostgreSQL
**COMPROVADO como dívida de evidência.** O drill de PostgreSQL é recuperável e ficou verde, mas Storage privado e chaves externas não são cobertos por esse dump e não foram reproduzidos nesta auditoria.

Ação requerida: provar backup/restauração de objetos privados e procedimento de recuperação/rotação das chaves sem registrar material secreto em evidências.

### P1 — rollback do candidato exato não validado
**NÃO VALIDADO.** Existem contratos e automação de rollback transacional, mas o release `73821512...` não foi implantado; portanto não há como atribuir um drill de rollback ao candidato atual.

### P2 — issue operacional #113 ainda aberta, mas não é prova isolada de defeito
A auditoria tentou refutar o P0 histórico: os fluxos locais atuais passaram em E2E limpo (59/59), inclusive criação/reagendamento na Agenda, Paciente 360, atendimento/AAL2 e rotinas administrativas. Assim, manter `#113` aberta não deve ser usado sozinho como prova de falha. Ela só pode ser encerrada/certificada depois da homologação no SHA implantado exato.

### P3 — documentação de backup divergente do runtime
**SAFE / CORRIGIDO NESTA AUDITORIA.** `BACKUP_RESTORE.md` ainda apontava `/mnt/fredwin-backup/solange/homologacao/`, mas `scripts/backup-homologation.sh` e o host usam `/home/ubuntu/solange-client-demo/backups`. A documentação foi alinhada ao caminho canônico atual.

## Achados anteriores refutados ou resolvidos
- **Gate DB vermelho:** refutado no estado atual. `supabase db reset` passou em execução fresca, `559/559` pgTAP passaram e o workflow `Database` do SHA auditado concluiu com sucesso.
- **E2E operacional ausente localmente:** refutado para o código local. Após reset limpo e build com ambiente correto, `59/59` E2E passaram. Isso não substitui homologação remota do SHA exato.
- **Restore de banco não comprovado:** resolvido para o escopo do dump `public + clinical + auth`, com checksum e restore isolado em 7 segundos.

## Matriz de cobertura
| Área | Resultado | Evidência / pendência |
| --- | --- | --- |
| Build/lint/typecheck | PASS | execução fresca no `73821512...` |
| Unitários/integração | PASS | 623 PASS / 1 SKIP |
| Arquitetura/módulos/migrations/seed | PASS | contratos verdes |
| Database reset | PASS | rebuild completo migrations + seed |
| pgTAP/RLS | PASS | 559/559 |
| E2E local limpo | PASS | 59/59 após reset |
| CI / Database / Governance no SHA | PASS | três workflows canônicos verdes |
| Providers live em staging | PASS | flags live desligadas |
| Backup DB + checksum | PASS | último artefato íntegro |
| Restore DB isolado | PASS | RTO observado 7 s |
| SHA exato em homologação | **FAIL** | `a66af3...` implantado vs `73821512...` auditado |
| Workers em lockstep | **FAIL/NÃO COMPROVADO** | mensageria antiga; document worker sem SHA imutável |
| Smoke/E2E no release implantado exato | NÃO VALIDADO | depende da promoção |
| Rollback do candidato exato | NÃO VALIDADO | candidato não implantado |
| Storage privado / chaves externas | NÃO VALIDADO | recuperação não reproduzida |
| Produção com dados reais | NÃO AUTORIZADO | permanece NO-GO |

## Risco residual
**Alto para go-live**, apesar da forte evidência de qualidade do código. O maior risco não está hoje em unitários, migrations ou E2E local: está na cadeia de release/proveniência. Certificar um SHA que não é o SHA executado cria falsa confiança e impede atribuir comportamento observado ao código candidato.

## Dívida de evidência / sequência obrigatória
1. Promover o SHA canônico atual somente com CI + Database + Governance verdes.
2. Provar `health.buildSha == SHA candidato` e versões imutáveis equivalentes para workers.
3. Executar homologação real/smoke sobre o SHA implantado, incluindo P0 #113 e negativas de segurança.
4. Executar/registrar rollback do candidato ou release equivalente pela automação atual.
5. Provar recuperação do Storage privado e procedimento de recuperação das chaves externas.
6. Reexecutar o Gate Final de Completude e atualizar esta auditoria.

## Regra de validade
Esta auditoria cobre o código do SHA `73821512f1e50fbacc24cb80d182d3e17e4f8cf0` e o estado de homologação observado em 2026-09-15. A atualização documental da auditoria gera um SHA posterior, mas não transforma esse commit documental em novo release de aplicação certificado. Mudança material em autenticação, schema, finanças, estados, integrações, workers, infraestrutura, deploy ou recuperação exige reauditoria proporcional ao risco.
