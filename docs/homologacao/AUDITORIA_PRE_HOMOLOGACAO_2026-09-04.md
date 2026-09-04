# Auditoria pré-homologação — 04/09/2026

## 1. Objetivo

Registrar o estado real do projeto Solange Rolla antes da homologação funcional, distinguindo:

- componente implementado;
- cobertura automatizada;
- rotina realmente alcançável por usuário/worker;
- rotina implantada no ambiente auditado;
- gate exclusivo de produção;
- pendência técnica que impede homologar a rotina correspondente.

Uma funcionalidade não é considerada homologável apenas porque existem tabelas, migrations, funções de domínio ou testes unitários.

O status técnico mais recente e a rastreabilidade por issue/PR ficam em `PENDENCIAS_TECNICAS_HOMOLOGACAO.md`.

## 2. Escopo auditado

Foram confrontados:

- `main` oficial do GitHub;
- commits, PRs e Actions recentes;
- rotas protegidas e públicas;
- agenda, pessoas, formulários, assinaturas, mensageria, financeiro, payables, eventos, fiscal, clínico, relatórios, automações e auditoria;
- runbooks de operação, segurança, backup/restore e go-live;
- VM de homologação, containers e preflight;
- SHA do ambiente de demonstração;
- timers/cron e volume dedicado a backup;
- existência de callers reais das funções de domínio críticas.

## 3. Baseline

### Código oficial

- Repositório: `fredmourao-ai/solange-rolla-consultorio`.
- Branch auditada: `main`.
- SHA de referência: `8727e4898ba7bedafe6ccdba794ed57e6582b17e`.
- Esse SHA já inclui a infraestrutura real de mensageria do PR #67 e a cobertura ampliada da política de cancelamento do PR #68.

### Ambiente de demonstração

O ambiente auditado apresentou `PREFLIGHT=PASS` no escopo coberto:

- containers essenciais em execução;
- worker de documentos com heartbeat válido;
- HTTP 200 em `/`, `/login` e `/api/health`;
- smoke autenticado de dashboard, agenda, financeiro e fiscal;
- checks estáticos do pacote de demonstração.

Porém, o demo estava no SHA `a0ff7fdab71951e4aa5927cf349d9a387ddcf859`, anterior ao `main` auditado. Logo, o preflight prova saúde do **demo antigo**, não presença das funcionalidades mais recentes. A promoção exata do SHA candidato está rastreada na Issue #82.

## 4. Resumo executivo

### Pontos sólidos

- arquitetura modular e contratos de módulo;
- migrations e isolamento de ambientes;
- cadastro de pessoas;
- formulário público, revisão, assinatura, capability e geração documental;
- expiração/escopo de capability links;
- regra de cancelamento de 48 horas computáveis, sábado e domingo sem contagem;
- testes cobrindo todos os dias da semana e a fronteira exata do deadline;
- separação de agenda, financeiro e fiscal;
- módulo clínico criptografado e segregado;
- worker de documentos operacional no demo auditado;
- infraestrutura real de e-mail/WhatsApp, outbox, retry e webhook incorporada ao `main`;
- páginas reais de leitura para dashboard, agenda, pessoas, eventos, financeiro, fiscal e relatórios;
- runbooks de go-live, incidentes, privacidade e restore.

### Pendências relevantes

1. **Autenticação de staging/demo — P0, PR #70.** No `main` auditado, páginas protegidas sem sessão só redirecionam quando `APP_ENV=production`. Não usar dados pessoais no ambiente exposto antes de corrigir, implantar e retestar isso.
2. **Agenda administrativa — P1, Issue #75.** `/agenda` é somente leitura. Não há caller real no `main` para criar/editar consulta ou concluir reagendamento pela secretaria.
3. **No-show/cancelamento tardio com cobrança — P1, PR #71.** O PR cria o caminho, mas tinha E2E falhando e review técnico pendente.
4. **Confirmação automática ~24h — P1, PR #72.** A infraestrutura de entrega existe, mas emissão do capability + agendamento automático permaneciam fora do `main` e a branch estava divergente/review pendente.
5. **Financeiro e payables — P1, Issue #76.** Domínio existe; `/financeiro` é leitura e não há UI/caller real para pagamento, ajuste, estorno, despesa, baixa ou recorrência.
6. **Eventos — P1, Issue #77.** `/eventos` lê dados, mas não oferece criação, inscrição, presença, despesas e cobrança completas.
7. **Fiscal mock/sandbox — P1, Issue #78.** `requestNfse`, mock, fila e cancelamento existem em aplicação, porém `/fiscal` é leitura e não há caller operacional real.
8. **Exportações — P2, Issue #79.** Não foi encontrado caminho real para CSV/XLSX/PDF, apesar de documentação anterior sugerir disponibilidade.
9. **Backup automático — P1, Issue #80.** Runbook e verificador de restore existem; geração automática/scheduler não estava ativa.
10. **Aniversário — P2, Issue #81.** O modelo possui `birth_date`/opt-out, mas não foi encontrado caller/cron específico para a automação.
11. **Promoção de ambiente — P1, Issue #82.** O ambiente deve rodar exatamente o SHA candidato antes que evidências de homologação sejam aceitas.

## 5. Auditoria por domínio

| Domínio | Código/DB | Testes | Operação real no `main` | Estado |
| --- | --- | --- | --- | --- |
| Autenticação | Sim | Sim | Existe com gap fora de produção | **P0 — PR #70** |
| Dashboard | Sim | Sim | Leitura real | READY após #70 |
| Pessoas | Sim | Sim | Fluxo real existente | READY após #70 |
| Agenda — leitura | Sim | Sim | Sim | READY após #70/#82 |
| Agenda — criar/editar/reagendar | Domínio existe | Parcial | Não no `main` | **P1 — #75** |
| Regra 48h | Sim | Sim, bordas ampliadas | Aplicada pelo domínio | READY após #82 |
| Formulário público | Sim | E2E | Sim | READY |
| Assinatura/PDF | Sim | E2E + worker | Sim | READY |
| Resposta pública de confirmação | Sim | E2E | Sim, quando link existe | READY/PARTIAL |
| Geração automática da confirmação | Parcial | PR #72 | Não no `main` | **P1 — #72** |
| Entrega e-mail/WhatsApp | Sim no `main` | CI #67 verde | Worker existe no código | Deploy/config dependem #82/#72 |
| No-show/cancelamento tardio | Domínio | Sim | Cobrança real só no PR #71 | **P1 — #71** |
| Recebíveis — leitura | Sim | Sim | Sim | READY |
| Pagamentos/ajustes/estornos | Sim | Unit | Não pela UI | **P1 — #76** |
| Contas a pagar | Sim | Unit | Não pela UI | **P1 — #76** |
| Eventos — leitura | Sim | E2E básico | Sim | READY |
| Evento operacional completo | Camadas existem | Parcial | Não completo | **P1 — #77** |
| Fiscal — leitura/readiness | Sim | Sim | Sim | READY |
| NFS-e mock/sandbox operacional | Sim em aplicação | Unit/integração | Sem caller real | **P1 — #78** |
| Clínico | Sim | E2E segurança | `psychologist_owner` + AAL2 | READY com MFA clínico |
| Relatórios de tela | Sim | Unit/E2E | Sim | READY |
| Exportações | Pretendidas | Não evidenciadas | Não encontrado | **P2 — #79** |
| Aniversário | Dados/template base | Parcial | Caller/cron não encontrado | **P2 — #81** |
| Auditoria | Sim | Sim | Integrada a ações críticas existentes | READY |
| Backup/restore | Restore desenhado | Script de restore | Backup automático ausente | **P1 — #80** |

## 6. Segurança e privacidade

### 6.1 Rotas protegidas

O `main` auditado contém fallback de `staff` quando não há sessão fora de `production`. Em uma homologação exposta por túnel/rede, isso é P0. O PR #70 deve ser mergeado, implantado e retestado antes de usar os dados pessoais autorizados do testador.

### 6.2 Clínico e MFA

A aplicação exige `psychologist_owner` + AAL2/MFA para ler/escrever conteúdo clínico. A decisão de não exigir MFA globalmente não deve enfraquecer esse step-up do módulo clínico. Para homologar clínico, usar papel correto e AAL2; para conteúdo, utilizar texto fictício.

### 6.3 Dados de homologação

A regra geral do projeto evita dados reais em teste. Nesta rodada há autorização explícita para usar somente os **próprios dados pessoais do patrocinador/testador** quando isso for necessário para validar entrega real. Continuam proibidos:

- dados de terceiros/pacientes reais da cliente;
- conteúdo clínico verdadeiro;
- secrets/tokens em evidências;
- CPF completo, respostas clínicas ou XML fiscal bruto em logs/screenshots.

Antes do go-live, dados de homologação e credenciais temporárias precisam de limpeza/anonimização/rotação conforme aplicável, inclusive em backups.

## 7. Mensageria

O PR #67 já incorporado ao `main` adicionou:

- repositórios Supabase reais;
- outbox e tentativas;
- deduplicação de webhook;
- SMTP;
- Meta WhatsApp Cloud API;
- worker Node;
- feature flags/kill switches.

O demo auditado era anterior a esse código e não tinha o novo messaging worker em execução. Além disso, confirmação iniciada pelo negócio fora da janela de atendimento do WhatsApp precisa usar template aprovado pela Meta; texto livre não é solução de produção.

Para homologação, e-mail/WhatsApp só recebem PASS após entrega comprovada ao canal autorizado do próprio testador, no SHA candidato implantado.

## 8. Agenda, financeiro, eventos e fiscal

A auditoria identificou um padrão: o domínio interno é mais completo que a operação administrativa exposta.

- `/agenda`: consulta e renderiza `appointments`; não cria/edita no `main` auditado — Issue #75.
- `/financeiro`: lê recebíveis/pagamentos; não registra pagamento, estorno, ajuste ou payables — Issue #76.
- `/eventos`: lê eventos/inscrições; não oferece o ciclo administrativo completo — Issue #77.
- `/fiscal`: lê a fila; não solicita/cancela NFS-e mock/sandbox — Issue #78.
- `/relatorios`: exibe métricas; exportações reais não foram encontradas — Issue #79.

Inserir dados diretamente no banco para demonstrar as telas pode ser útil a um teste técnico isolado, mas **não transforma a rotina de usuário em PASS**.

## 9. Backup e restore — resposta objetiva

### Incluído no projeto

- `docs/operations/BACKUP_RESTORE.md`;
- alvo de RPO 24h/RTO 4h para produção;
- restore em ambiente isolado;
- `scripts/verify-backup-restore.sh` para validar um dump existente;
- gate de go-live exigindo backup recente + restore drill;
- volume separado `/mnt/fredwin-backup` disponível no host.

### Ausente/ina­tivo na auditoria

- script Solange gerando o backup lógico;
- systemd timer ou cron Solange agendando backup;
- arquivo de backup Solange no volume dedicado;
- restore comprovado a partir de backup criado automaticamente.

**Conclusão:** a rotina foi desenhada documentalmente e o restore possui verificador, mas **o backup automático não estava operacionalmente incluído**. A implementação e o drill estão rastreados na Issue #80.

Isso não impede smoke tests iniciais não destrutivos, mas impede encerrar a homologação e, com ainda mais razão, o go-live.

## 10. Infraestrutura

Durante a auditoria:

- VM online;
- Supabase local/demo saudável no preflight;
- worker de documentos ativo;
- disco raiz em aproximadamente 83% de uso;
- `/mnt/fredwin-backup` montado;
- volume de backup com aproximadamente 216 GB totais e 204 GB livres.

A aproximação de 85% no root deve ser tratada como alerta operacional para builds/logs/dumps.

## 11. PRs e issues de homologação

### Existentes antes desta auditoria aprofundada

- **PR #70 — P0:** autenticação real fora de produção; CI estava verde.
- **PR #71 — P1:** no-show/cancelamento tardio e cobrança; E2E falhava e havia review pendente sobre preço ausente, idempotência, erros de lookup, snapshot de política e ação de cobrança.
- **PR #72 — P1:** agendamento automático da confirmação; branch divergente e review pendente sobre contrato de enqueue/deduplicação.

### Criadas a partir desta auditoria

- **#75:** agenda operacional criar/editar/reagendar;
- **#76:** pagamentos, ajustes, estornos e payables;
- **#77:** eventos completos;
- **#78:** NFS-e mock/sandbox operacional;
- **#79:** exportações CSV/XLSX/PDF;
- **#80:** backup automático e restore drill;
- **#81:** automação de aniversário;
- **#82:** promover ambiente no SHA candidato exato.

## 12. Veredito

### É possível iniciar testes?

**Sim, em fases.**

Podem começar testes de infraestrutura/smoke e rotinas realmente alcançáveis, inicialmente com dados sintéticos. Não se deve confundir o preflight do demo antigo com homologação do `main` atual.

Antes de inserir os dados pessoais autorizados do testador, o P0 de autenticação (#70) precisa estar resolvido e implantado.

A homologação funcional final não pode ser encerrada enquanto houver P1 obrigatório `BLOCKED`, especialmente agenda write path, no-show/cobrança, confirmação automática, financeiro, eventos, fiscal mock/sandbox, backup/restore e promoção do SHA exato.

Os dados fiscais definitivos, contabilidade, textos finais, domínio definitivo e credenciais próprias da cliente continuam sendo gates de **produção**, não impedimentos para os testes permitidos de homologação.

## 13. Sequência recomendada

1. Resolver PR #70.
2. Corrigir/incorporar os P1 de aplicação necessários (#71, #72, #75, #76, #77, #78, #80).
3. Definir o SHA candidato e promovê-lo exatamente para o demo (#82).
4. Rodar CI/E2E e preflight no mesmo SHA.
5. Executar Fases 0–1 do manual com dados sintéticos.
6. Após segurança PASS, usar os dados próprios autorizados do testador para mensageria real.
7. Executar toda a matriz funcional, incluindo cenários negativos.
8. Gerar backup automaticamente e provar restore isolado (#80).
9. Resolver/decidir P2 (#79 e #81) conforme escopo de aceite.
10. Reexecutar regressão completa e registrar SHA homologado.

A matriz de evidências é a fonte do resultado de cada rodada; `PENDENCIAS_TECNICAS_HOMOLOGACAO.md` é a fonte do status técnico corrente.