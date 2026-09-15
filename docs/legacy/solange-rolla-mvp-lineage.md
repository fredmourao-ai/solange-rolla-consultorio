# Linhagem do MVP Solange Rolla

## Status

`fredmourao-ai/solange-rolla` é o **protótipo/MVP local histórico** que antecedeu o sistema atual.

`fredmourao-ai/solange-rolla-consultorio` é o **único repositório canônico e ativo** do projeto Solange Rolla para código, documentação, issues, auditorias, releases e operação.

O objetivo deste documento é preservar proveniência e requisitos úteis sem introduzir código legado, `localStorage` ou uma segunda fonte de verdade no sistema moderno.

## Origem

O repositório legado implementou um MVP estático em HTML/CSS/JavaScript, com persistência em `localStorage`, voltado a validar visualmente e operacionalmente conceitos de clientes, agenda, financeiro, eventos, fiscal e auditoria.

A auditoria do MVP de 03/09/2026 registrou explicitamente que ele não possuía backend transacional, autenticação, controle de acesso real, integração fiscal/pagamento real, backup confiável, multiusuário ou proteção adequada para dados sensíveis. Esses limites tornam o protótipo inadequado para operação real e foram justamente a motivação para a arquitetura atual.

## Matriz de reconciliação

| Conceito do MVP/arquitetura antiga | Estado | Destino canônico / decisão |
| --- | --- | --- |
| Cadastro único de cliente/pessoa | `CARRIED_FORWARD` | `docs/DATA_MODEL.md` usa `people` como identidade administrativa única e `person_relationships` para relações de responsabilidade. |
| Dados fiscais no cadastro | `CARRIED_FORWARD` | `people` contém endereço fiscal estruturado e o domínio `fiscal` possui perfis/tratamentos/documentos próprios. |
| Data de nascimento | `CARRIED_FORWARD` | `people.birth_date` e fluxo de aniversário em `docs/PRODUCT_FLOWS.md`. |
| Contato de emergência | `NEEDS_PRODUCT_DECISION` | O conceito aparece no MVP legado, mas não está explicitamente representado no modelo/fluxos canônicos atuais. Deve ser decidido no produto moderno antes de implementação; não transportar a entidade legada mecanicamente. |
| Agenda/agendamento | `CARRIED_FORWARD` | Domínio `appointments`, histórico de estado e fluxos de criação, confirmação, reagendamento, cancelamento, falta e conclusão. |
| Confirmação/reagendamento/cancelamento | `CARRIED_FORWARD` | `docs/PRODUCT_FLOWS.md` define confirmação 24h, `reschedule_requested`, cancelamento por deadline e histórico. |
| Política temporal e histórico | `CARRIED_FORWARD` | `cancellation_policies`, `policy_version`, `cancellation_deadline_at`, timezone `America/Sao_Paulo` e histórico append-only. |
| Financeiro por atendimento/evento | `CARRIED_FORWARD` | `receivables`, `payments`, `payment_refunds`, `receivable_adjustments`, `payables` e origem `source_type/source_id`. |
| Conciliação financeira | `CARRIED_FORWARD` | Modelo canônico separa charge, pagamentos, refunds, saldo e origem, preservando histórico e idempotência. |
| Eventos e participantes | `CARRIED_FORWARD` | `events`, `event_registrations`, presença, despesas e resultado financeiro. |
| Perfil fiscal e emissão de NFS-e | `CARRIED_FORWARD` | Domínio fiscal dedicado, provider sandbox/live por flag, tentativas, protocolos, XML/PDF privados e cancelamento/substituição. |
| Agenda continua operando se fiscal estiver indisponível | `CARRIED_FORWARD` | Estados de agenda, financeiro e fiscal são independentes; integração fiscal ocorre por comando/fila idempotente. |
| Auditoria de mudanças relevantes | `CARRIED_FORWARD` | `audit_events` append-only, logs sanitizados e regras específicas de auditoria em `AGENTS.md`/`SECURITY_PRIVACY.md`. |
| Proteção por perfil de dados sensíveis | `CARRIED_FORWARD` | RLS default-deny, papéis `psychologist_owner`, `secretary`, `accounting`, MFA/AAL2 e separação clínica L3. |
| Backup e restauração testada | `CARRIED_FORWARD` | Requisito existe em segurança/runbooks, mas continua sujeito aos gates reais de homologação/go-live; documentação não prova restore. |
| Dashboard orientado à operação diária | `CARRIED_FORWARD` | `Dashboard Atenção Hoje` cobre consultas, formulários, reagendamentos, recebíveis, contas a pagar, NFS-e, filas e aniversários. |
| Persistência por `localStorage` | `RETIRED` | Substituída por PostgreSQL/Supabase como fonte de verdade. Não migrar dados locais. |
| Aplicação estática `index.html` + `app.js` | `RETIRED` | Substituída pelo monólito modular Next.js/TypeScript. Arquivos antigos permanecem apenas como histórico no repositório legado. |
| Ausência de autenticação/backend | `SUPERSEDED` | Arquitetura atual possui Auth, RLS, MFA, backend/DB e workers. |
| Emissão fiscal apenas visual | `SUPERSEDED` | Arquitetura atual possui domínio fiscal real com adapters, filas e sandbox; produção live continua sujeita a gate. |
| Dados sensíveis no navegador | `RETIRED` | O sistema atual define classificação L0-L4, criptografia para conteúdo sensível, buckets privados, RLS e proibição de dados reais em desenvolvimento. |
| Falta de testes automatizados | `SUPERSEDED` | Projeto atual possui Vitest, Playwright, pgTAP/RLS, contract tests e CI; isso não substitui a obrigação de verificar os gates de cada release. |

## Achados críticos/altos do MVP e destino

### Dados sensíveis sem autenticação/criptografia

**Status:** `SUPERSEDED` arquiteturalmente.

O sistema canônico possui baseline explícito de segurança, RLS, MFA, criptografia de conteúdo L3 e segregação clínica. A efetividade deve ser comprovada nos testes/gates atuais; a auditoria antiga não serve como evidência positiva nem negativa do release moderno.

### Ausência de backend transacional

**Status:** `SUPERSEDED`.

PostgreSQL/Supabase é a fonte de verdade e os domínios financeiro/fiscal possuem invariantes, constraints e idempotência. As pendências atuais de atomicidade/homologação continuam sendo tratadas no repositório canônico.

### Fiscal apenas visual

**Status:** `SUPERSEDED`, com live ainda condicionado a go-live.

O domínio moderno prevê NFS-e por adapter, sandbox/live, filas, tentativas e armazenamento privado. A habilitação live não é inferida pela existência do código.

### Sem testes automatizados

**Status:** `SUPERSEDED`.

O sistema moderno possui suíte automatizada e gates; nenhuma certificação é válida sem execução do protocolo de auditoria do SHA/release correspondente.

### Edição/exclusão/perfis/histórico insuficientes

**Status:** `SUPERSEDED/CARRIED_FORWARD` conforme domínio.

O sistema atual tem autorização, histórico append-only onde necessário, soft-delete/archive e fluxos operacionais específicos. Lacunas reais permanecem representadas pelas issues canônicas de homologação/P0.

## Decisões que NÃO foram migradas

Não são parte do produto atual e não devem ser reintroduzidas sem ADR/decisão explícita:

- `localStorage` como banco;
- aplicação estática como runtime principal;
- roles genéricos do protótipo que conflitem com a matriz atual;
- Prisma como escolha obrigatória (SQL/migrations e Supabase/PostgreSQL são a direção vigente);
- qualquer dado local do navegador;
- qualquer segredo, token, cache ou informação pessoal real;
- evidência de testes visuais do MVP como prova do sistema atual.

## Pendência de produto preservada

### Contato de emergência

O MVP previa uma entidade `ContatoEmergencia`. A documentação canônica atual não a define explicitamente. A unificação não inventa uma implementação nem descarta o requisito: ele permanece marcado como `NEEDS_PRODUCT_DECISION` e deve ser avaliado no repositório canônico quanto a finalidade, base legal, campos mínimos, autorização, retenção e eventual relação com `person_relationships`.

## Regra de auditoria

Toda evidência do repositório `fredmourao-ai/solange-rolla` é **proveniência histórica**. Ela não pode ser contabilizada como teste, homologação, restore, segurança ou comportamento de produção do sistema atual.

O único ledger de certificação do projeto Solange Rolla é:

`fredmourao-ai/solange-rolla-consultorio/docs/quality/AUDIT_STATUS.md`

## Regra de desenvolvimento

A partir desta consolidação:

- nenhuma feature nova deve ser implementada em `fredmourao-ai/solange-rolla`;
- toda issue funcional nova pertence a `fredmourao-ai/solange-rolla-consultorio`;
- o repositório legado deve permanecer apenas como histórico/proveniência;
- relatórios futuros contam ambos os nomes antigos como **um único projeto: Solange Rolla**.
