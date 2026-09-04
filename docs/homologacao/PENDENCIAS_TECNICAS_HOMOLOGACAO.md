# Pendências técnicas rastreadas para homologação

Este documento é a **camada de status mais recente** da auditoria. Se houver divergência entre o estado inicial marcado no manual e esta lista, prevalece esta lista até a issue/PR correspondente ser resolvida, incorporada e revalidada no ambiente.

## P0 — antes de usar dados pessoais no ambiente exposto

| Área | Estado | Rastreamento | Critério de liberação |
| --- | --- | --- | --- |
| Autenticação de rotas protegidas fora de `production` | Pendente | PR #70 | CI verde, merge, deploy e teste anônimo em todas as rotas protegidas |

## P1 — obrigatórias para homologação funcional final

| Área | Estado | Rastreamento | Casos afetados |
| --- | --- | --- | --- |
| Agenda criar/editar/reagendar consulta | `main` auditado é somente leitura | Issue #75 | H-APT-002..005, parte de H-CNF-008 |
| No-show e cobrança de cancelamento tardio | PR com E2E/review pendentes | PR #71 | H-NSH-001..006 |
| Confirmação automática ~24h | branch divergente/review pendente | PR #72 | H-AUTO-001..005 e geração automática da mensagem |
| Financeiro e contas a pagar operacionais | domínio existe, UI não | Issue #76 | H-FIN-002..009, H-PAY-001..006 |
| Eventos operacionais | tela é leitura, ciclo administrativo incompleto | Issue #77 | H-EVT-002..009 |
| Fiscal mock/sandbox operacional | domínio existe, tela é leitura | Issue #78 | H-FIS-003..009 |
| Backup automático + restore drill | não havia job/timer/backup Solange ativo | Issue #80 | H-BKP-001..008 |
| Ambiente no SHA candidato exato | demo auditado estava em SHA antigo | Issue #82 | H-ENV-001..005 e qualquer evidência funcional |

## P2 — devem ser decididas/corrigidas antes do aceite final conforme escopo aprovado

| Área | Estado | Rastreamento | Casos afetados |
| --- | --- | --- | --- |
| Exportações administrativas CSV/XLSX/PDF | caminho real não encontrado | Issue #79 | H-REP-006..009 |
| Automação de aniversário | modelo de dados existe, caller/cron não encontrado | Issue #81 | H-BDAY-001..004 |

## Itens já incorporados e úteis para a homologação

| Área | Evidência |
| --- | --- |
| Infraestrutura real de e-mail/WhatsApp, outbox, retry e worker | PR #67 merged; precisa estar no SHA implantado |
| Regra de cancelamento 48h computáveis, sábado/domingo zero, fronteira exata | PR #68 merged |
| Formulário público, assinatura, capability e geração documental | código/E2E existentes; worker de documentos passou no preflight do demo auditado |
| Runbook de backup/restore | existe, mas não substitui a automação rastreada na Issue #80 |

## Correção da leitura da Agenda

A inspeção aprofundada de `src/app/(protected)/agenda/page.tsx` no SHA `8727e489...` confirmou que a página apenas consulta `appointments` e renderiza `AppointmentCalendar`. Portanto:

- H-APT-001 (visualização) pode ser executado;
- H-APT-002 (criar consulta), H-APT-004 (conflito por criação real) e operações de reagendamento administrativo devem permanecer `BLOCKED` até a Issue #75;
- não usar inserção direta no banco para transformar esses casos em PASS, pois isso não homologa a rotina de usuário.

## Regra de atualização

Ao resolver cada item:

1. PR com testes aplicáveis verdes;
2. merge no `main`;
3. promover o novo SHA candidato no ambiente;
4. executar os casos afetados do manual;
5. registrar evidência na matriz;
6. somente então alterar `BLOCKED/PARTIAL` para `PASS`.