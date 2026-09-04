# Matriz de evidências da homologação

Use esta matriz como controle executivo. Os casos detalhados e seus passos estão em `MANUAL_TESTES_HOMOLOGACAO.md`.

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
| Versão e saúde | H-ENV-001..006 | READY; demo auditado estava em SHA antigo | NOT RUN | |
| Login/sessão | H-AUTH-001..005 | P0: autenticação de staging depende PR #70 | NOT RUN | #70 |
| MFA/autorização clínica | H-AUTH-006..007 | READY com `psychologist_owner` AAL2 | NOT RUN | |
| Dashboard | H-DASH-001..003 | READY | NOT RUN | |
| Cadastro de pessoas | H-PEO-001..007 | READY/confirmar alguns callers | NOT RUN | |
| Agenda básica | H-APT-001..005 | READY/confirmar criação no SHA | NOT RUN | |
| Política 48h | H-APT-006..010 | READY; cobertura automatizada ampliada | NOT RUN | #68 merged |
| Formulário | H-FRM-001..008 | READY | NOT RUN | |
| Assinatura/PDF | H-SIG-001..007 | READY; worker de documentos ativo no demo auditado | NOT RUN | |
| Confirmação/cancelamento/reagendamento | H-CNF-001..010 | READY para link emitido; cobrança tardia separada | NOT RUN | |
| Agendamento automático 24h | H-AUTO-001..005 | BLOCKED no main | NOT RUN | #72 |
| Mensageria | H-MSG-001..010 | Código merged; demo auditado desatualizado | NOT RUN | #67 merged / #72 |
| Atendimento/clínico | H-CLI-001..006 | READY com ressalva de AAL2 | NOT RUN | |
| No-show/cobrança tardia | H-NSH-001..006 | BLOCKED no main | NOT RUN | #71 |
| Recebíveis leitura | H-FIN-001 | READY | NOT RUN | |
| Pagamentos/ajustes/estornos | H-FIN-002..009 | BLOCKED pela UI no main | NOT RUN | criar/relacionar issue técnica |
| Contas a pagar | H-PAY-001..006 | BLOCKED pela UI no main | NOT RUN | criar/relacionar issue técnica |
| Eventos leitura | H-EVT-001 | READY | NOT RUN | |
| Eventos operacionais | H-EVT-002..009 | BLOCKED/PARTIAL pela UI | NOT RUN | criar/relacionar issue técnica |
| Fiscal leitura | H-FIS-001..002 | READY | NOT RUN | |
| NFS-e mock/sandbox operacional | H-FIS-003..010 | BLOCKED/PARTIAL; live é PROD-GATE | NOT RUN | criar/relacionar issue técnica |
| Relatórios de tela | H-REP-001..005 | READY | NOT RUN | |
| Exportações | H-REP-006..009 | CSV/XLSX/PDF BLOCKED no main | NOT RUN | criar/relacionar issue técnica |
| Aniversário/automações | H-BDAY-001..004 | PARTIAL; verificar caller/cron | NOT RUN | |
| Audit trail | H-AUD-001..004 | READY | NOT RUN | |
| LGPD/operação | H-LGPD-001..006 | READY documental/exercício | NOT RUN | |
| Segurança negativa | H-SEC-001..008 | READY após fechar gap de autenticação | NOT RUN | #70 |
| Resiliência/idempotência | H-RES-001..006 | READY/PARTIAL; financeiro depende caller | NOT RUN | |
| Mobile/acessibilidade | H-UX-001..006 | READY | NOT RUN | |
| Backup/restore | H-BKP-001..008 | BLOCKED/PARTIAL — backup automático ausente | NOT RUN | criar issue técnica de backup |
| Deploy/rollback/operação | H-OPS-001..006 | READY para exercício | NOT RUN | |
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
| SHA candidato = implantado | NOT RUN | |
| CI aplicável verde | NOT RUN | |
| Nenhum P0 aberto | NOT RUN | |
| Nenhum P1 obrigatório aberto | NOT RUN | |
| Fluxo consulta completo | NOT RUN | |
| Formulário + assinatura + PDF | NOT RUN | |
| Cancelamento/reagendamento | NOT RUN | |
| No-show/cobrança | NOT RUN | |
| Mensageria real de homologação | NOT RUN | |
| Financeiro operacional | NOT RUN | |
| Eventos operacional | NOT RUN | |
| Fiscal mock/sandbox | NOT RUN | |
| Segurança/RLS | NOT RUN | |
| Backup criado | NOT RUN | |
| Restore isolado | NOT RUN | |
| Mobile/acessibilidade | NOT RUN | |
| Limpeza/rotação planejada | NOT RUN | |
| Homologação funcional | NOT RUN | |

A aprovação para produção continua separada e depende dos gates externos em `docs/operations/GO_LIVE_CHECKLIST.md`.