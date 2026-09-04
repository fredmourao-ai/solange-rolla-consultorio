# Matriz de evidências da homologação

Use esta matriz como controle executivo. Os casos detalhados e seus passos estão em `MANUAL_TESTES_HOMOLOGACAO.md`. O estado técnico corrente e a precedência sobre marcações iniciais do manual estão em `PENDENCIAS_TECNICAS_HOMOLOGACAO.md`.

## Cabeçalho da rodada

| Campo | Valor |
| --- | --- |
| Rodada | |
| Data/hora início | |
| Testador | |
| SHA candidato | |
| SHA implantado | |
| URL | |
| Migration head | |
| Dados de teste | sintéticos / dados próprios autorizados do testador |
| WhatsApp | mock / real homologação |
| E-mail | mock / real homologação |
| NFS-e | mock / sandbox |
| Resultado geral | NOT RUN |

## Critério

Cada grupo só pode ser `PASS` quando todos os casos obrigatórios do intervalo indicado estiverem PASS. Um `BLOCKED` técnico precisa de issue/PR; um `FAIL` precisa de correção + reteste.

| Grupo | Casos | Estado inicial auditado | Resultado da rodada | Evidência / issue / PR |
| --- | --- | --- | --- | --- |
| Versão e saúde | H-ENV-001..006 | READY para smoke; demo auditado em SHA antigo | NOT RUN | #82 |
| Login/sessão | H-AUTH-001..005 | P0: autenticação de staging depende PR #70 | NOT RUN | #70 |
| MFA/autorização clínica | H-AUTH-006..007 | READY com `psychologist_owner` AAL2 | NOT RUN | |
| Dashboard | H-DASH-001..003 | READY | NOT RUN | |
| Cadastro de pessoas | H-PEO-001..007 | READY/confirmar callers específicos na rodada | NOT RUN | |
| Agenda — visualização | H-APT-001 | READY | NOT RUN | |
| Agenda — criar/editar/conflito | H-APT-002..005 | BLOCKED: `/agenda` é somente leitura no main auditado | NOT RUN | #75 |
| Política 48h | H-APT-006..010 | READY; cobertura automatizada ampliada | NOT RUN | #68 merged |
| Formulário | H-FRM-001..008 | READY | NOT RUN | |
| Assinatura/PDF | H-SIG-001..007 | READY; worker de documentos ativo no demo auditado | NOT RUN | |
| Confirmação/cancelamento | H-CNF-001..007,009..010 | READY quando capability link existe; cobrança tardia separada | NOT RUN | |
| Reagendamento administrativo | H-CNF-008 | PARTIAL/BLOCKED: solicitação existe, conclusão pela agenda depende write path | NOT RUN | #75 |
| Agendamento automático 24h | H-AUTO-001..005 | BLOCKED no main | NOT RUN | #72 |
| Mensageria | H-MSG-001..010 | Código #67 merged; demo auditado desatualizado; auto-agendamento depende #72 | NOT RUN | #67 merged / #72 / #82 |
| Atendimento/clínico | H-CLI-001..006 | READY com ressalva de AAL2; caller de status da agenda deve ser revalidado | NOT RUN | #75 quando depender de write path |
| No-show/cobrança tardia | H-NSH-001..006 | BLOCKED no main | NOT RUN | #71 |
| Recebíveis leitura | H-FIN-001 | READY | NOT RUN | |
| Pagamentos/ajustes/estornos | H-FIN-002..009 | BLOCKED pela UI no main | NOT RUN | #76 |
| Contas a pagar | H-PAY-001..006 | BLOCKED pela UI no main | NOT RUN | #76 |
| Eventos leitura | H-EVT-001 | READY | NOT RUN | |
| Eventos operacionais | H-EVT-002..009 | BLOCKED/PARTIAL pela UI | NOT RUN | #77 |
| Fiscal leitura/readiness | H-FIS-001..002 | READY | NOT RUN | |
| NFS-e mock/sandbox operacional | H-FIS-003..010 | BLOCKED/PARTIAL; live é PROD-GATE | NOT RUN | #78 |
| Relatórios de tela | H-REP-001..005 | READY | NOT RUN | |
| Exportações | H-REP-006..009 | CSV/XLSX/PDF BLOCKED no main | NOT RUN | #79 |
| Aniversário/automações | H-BDAY-001..004 | BLOCKED/PARTIAL: caller/cron não encontrado | NOT RUN | #81 |
| Audit trail | H-AUD-001..004 | READY | NOT RUN | |
| LGPD/operação | H-LGPD-001..006 | READY documental/exercício | NOT RUN | |
| Segurança negativa | H-SEC-001..008 | READY após fechar gap de autenticação | NOT RUN | #70 |
| Resiliência/idempotência | H-RES-001..006 | READY/PARTIAL; financeiro depende caller | NOT RUN | #76 quando financeiro |
| Mobile/acessibilidade | H-UX-001..006 | READY nas rotinas alcançáveis | NOT RUN | |
| Backup/restore | H-BKP-001..008 | BLOCKED/PARTIAL — backup automático ausente | NOT RUN | #80 |
| Deploy/rollback/operação | H-OPS-001..006 | READY para exercício; promoção exata rastreada | NOT RUN | #82 |
| Encerramento | H-END-001..006 | depende de todos os anteriores | NOT RUN | |

## Registro de defeitos

| ID | Caso | Severidade | Descrição | Issue | PR | Reteste | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

## Severidade

- **P0:** segurança, vazamento, corrupção/perda de dados, autenticação quebrada ou efeito financeiro/fiscal grave; interrompe a fase afetada.
- **P1:** rotina obrigatória não executável ou resultado negocial incorreto; impede homologação final.
- **P2:** degradação relevante com workaround seguro; precisa decisão antes do aceite.
- **P3:** cosmético/documental sem risco de operação incorreta.

## Evidência aceitável

Preferir, conforme o caso:

- screenshot sanitizado;
- ID/UUID do registro de teste;
- query/read model sem PII desnecessária;
- audit event/correlation ID;
- log técnico sanitizado;
- resultado de CI/E2E;
- checksum de documento/backup;
- confirmação recebida no canal de teste;
- medição de RPO/RTO.

Não anexar secrets, tokens, CPF completo, resposta clínica ou XML fiscal bruto.

## Aceite final

| Gate | Resultado | Observação |
| --- | --- | --- |
| SHA candidato = implantado | NOT RUN | #82 |
| CI aplicável verde | NOT RUN | |
| Nenhum P0 aberto | NOT RUN | #70 inicialmente |
| Nenhum P1 obrigatório aberto | NOT RUN | #71, #72, #75, #76, #77, #78, #80 e outros aplicáveis |
| Fluxo consulta completo | NOT RUN | #75 |
| Formulário + assinatura + PDF | NOT RUN | |
| Cancelamento/reagendamento | NOT RUN | #75 / #71 conforme cenário |
| No-show/cobrança | NOT RUN | #71 |
| Mensageria real de homologação | NOT RUN | #72 / #82 |
| Financeiro operacional | NOT RUN | #76 |
| Eventos operacional | NOT RUN | #77 |
| Fiscal mock/sandbox | NOT RUN | #78 |
| Segurança/RLS | NOT RUN | #70 |
| Backup criado | NOT RUN | #80 |
| Restore isolado | NOT RUN | #80 |
| Mobile/acessibilidade | NOT RUN | |
| Limpeza/rotação planejada | NOT RUN | |
| Homologação funcional | NOT RUN | |

A aprovação para produção continua separada e depende dos gates externos em `docs/operations/GO_LIVE_CHECKLIST.md`.