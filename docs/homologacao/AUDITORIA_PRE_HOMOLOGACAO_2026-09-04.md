# Auditoria pré-homologação — 04/09/2026

## 1. Objetivo

Registrar o estado real do projeto Solange Rolla antes da homologação funcional, distinguindo:

- componente implementado;
- componente coberto por teste automatizado;
- rotina realmente alcançável por usuário/worker;
- rotina já implantada no ambiente atual;
- pendência que bloqueia apenas produção;
- pendência técnica que ainda impede homologar a rotina correspondente.

Esta auditoria não considera uma funcionalidade pronta apenas porque existem tabelas, migrations, funções de domínio ou testes unitários.

## 2. Escopo auditado

Foram confrontados:

- `main` oficial do GitHub;
- commits e PRs recentes;
- GitHub Actions/CI;
- rotas protegidas e públicas;
- módulos de agenda, pessoas, formulários, assinaturas, mensageria, financeiro, contas a pagar, eventos, fiscal, clínico, relatórios, automações e auditoria;
- runbooks de operação, segurança, backup/restore e go-live;
- VM de homologação e containers em execução;
- ambiente de demonstração e seu SHA implantado;
- timers/cron e volume dedicado a backup.

## 3. Baseline auditada

### Código oficial

- Repositório: `fredmourao-ai/solange-rolla-consultorio`.
- Branch: `main`.
- SHA de referência desta auditoria: `8727e4898ba7bedafe6ccdba794ed57e6582b17e`.
- O SHA inclui a infraestrutura real de mensageria do PR #67 e a cobertura ampliada da política de cancelamento do PR #68.

### Ambiente de demonstração

O ambiente em execução apresentou `PREFLIGHT=PASS`, incluindo:

- containers essenciais em execução;
- worker de documentos com heartbeat válido;
- HTTP 200 em `/`, `/login` e `/api/health`;
- smoke autenticado para dashboard, agenda, financeiro e fiscal;
- checks estáticos do pacote de demonstração.

Entretanto, o ambiente de demonstração estava implantado no SHA `a0ff7fdab71951e4aa5927cf349d9a387ddcf859`, anterior ao `main` auditado. Portanto, **PASS no preflight não prova que as funcionalidades mais recentes do `main` estão implantadas**.

## 4. Resumo executivo

### O que está sólido

- arquitetura modular e contratos de módulos;
- migrations e isolamento de ambientes;
- cadastro de pessoas;
- fluxo público de formulário/revisão/assinatura e geração documental;
- capability links e expiração de links;
- regra de cancelamento de 48 horas computáveis com sábado e domingo excluídos;
- cobertura de todos os dias da semana e fronteira exata do deadline;
- separação de agenda, financeiro e fiscal;
- módulo clínico criptografado e segregado;
- worker de documentos em execução;
- infraestrutura real de e-mail/WhatsApp, outbox, retry e webhooks incorporada ao `main`;
- dashboard, agenda, pessoas, eventos, financeiro, fiscal e relatórios possuem páginas reais de leitura;
- runbooks de go-live, backup/restore, incidentes e privacidade existem.

### O que ainda impede homologar algumas rotinas como usuário real

1. **Autenticação de staging/demo** — no `main` auditado, o layout protegido só redireciona usuário sem sessão quando `APP_ENV=production`. O PR #70 corrige isso e estava com CI verde. Enquanto a correção não estiver incorporada/implantada, o ambiente de homologação não deve ser considerado representativo da segurança real.
2. **No-show/cancelamento tardio com cobrança** — o PR #71 cria o caminho real pela agenda, mas estava aberto com E2E falhando e comentários de revisão não resolvidos. No `main`, a rotina ainda não é executável de ponta a ponta pela UI.
3. **Confirmação automática ~24h** — a infraestrutura de entrega existe no `main`, mas a emissão do capability link + agendamento do envio permanece no PR #72. O PR estava divergente do `main`, sem CI válido e com review pendente. Assim, o sistema ainda não prova envio automático completo da confirmação.
4. **Financeiro operacional** — a página `/financeiro` é atualmente um dashboard de leitura. Casos de uso de registrar pagamento, estorno e ajuste existem no módulo, mas não têm caller real na UI do `main`.
5. **Contas a pagar** — domínio e aplicação existem, inclusive recorrência, porém não há rota/UI real que permita cadastrar/baixar despesas durante a homologação.
6. **Eventos** — a página `/eventos` lê eventos/inscrições/capacidade/valores, porém o `main` não apresenta fluxo administrativo completo para criar evento, inscrever participante, registrar presença, despesas e cobrança.
7. **Fiscal/NFS-e** — fila, regras, mock e worker existem, mas a página `/fiscal` é de leitura. `requestNfse` não possui caller real no `main`. A emissão live deve continuar bloqueada por contabilidade, mas a homologação de mock/sandbox também precisa de um caminho operacional real.
8. **Relatórios/exportações** — relatórios de tela existem; não foi encontrado caminho real no `main` para exportações CSV/XLSX/PDF prometidas na documentação de produto.
9. **Backup automático** — runbook e script de verificação de restore existem, mas não há job/timer/cron de backup Solange ativo no ambiente auditado.

## 5. Auditoria por domínio

| Domínio | Código/DB | Testes | Caminho real no `main` | Implantado no demo auditado | Estado para homologação |
| --- | --- | --- | --- | --- | --- |
| Autenticação | Sim | Sim | Sim, com gap fora de produção | Sim | **PENDENTE P0 — PR #70** |
| Dashboard | Sim | Sim | Sim | Sim | Pronto após segurança |
| Pessoas | Sim | Sim | Sim | Sim | Pronto após segurança |
| Agenda leitura | Sim | Sim | Sim | Sim | Pronto após segurança |
| Regra 48h | Sim | Sim, bordas ampliadas | Usada pelo domínio | Demo anterior ao teste novo | Pronto após atualização do demo |
| Formulário público | Sim | E2E | Sim | Sim | Pronto |
| Assinatura/PDF | Sim | E2E + worker | Sim | Sim | Pronto |
| Confirmação resposta pública | Sim | E2E | Sim, quando link existe | Parcial | Pronto para link pré-criado |
| Geração automática da confirmação | Parcial | PR #72 | Não no `main` | Não | **PENDENTE P1** |
| Envio real e-mail/WhatsApp | Sim no `main` | CI PR #67 verde | Worker real existe | Worker novo não estava implantado | **PENDENTE implantação/configuração** |
| Reagendamento | Domínio/estado | Sim | Resposta pública solicita contato | Parcial | Testar solicitação; operação secretaria depende agenda |
| No-show/cancelamento tardio | Domínio | Sim | Cobrança real só no PR #71 | Não | **PENDENTE P1** |
| Recebíveis leitura | Sim | Sim | Sim | Sim | Pronto |
| Pagamentos/estornos/ajustes | Sim | Unit | Não pela UI | Não | **PENDENTE P1/P2** |
| Contas a pagar | Sim | Unit | Não pela UI | Não | **PENDENTE P1/P2** |
| Eventos leitura | Sim | E2E básico | Sim | Sim | Pronto para leitura |
| Evento operacional completo | Sim em camadas | Unit/E2E parcial | Não completo pela UI | Não | **PENDENTE P1/P2** |
| Fiscal leitura | Sim | Sim | Sim | Sim | Pronto para leitura |
| Solicitação NFS-e mock/sandbox | Sim em aplicação | Unit/integração | Não pela UI | Não | **PENDENTE P1/P2** |
| Clínico | Sim | E2E segurança | Sim para `psychologist_owner` AAL2 | Disponibilidade depende perfil/MFA | Pronto com ressalva de MFA |
| Relatórios tela | Sim | Unit/E2E | Sim | Sim | Pronto |
| Exportações | Documentadas | Não evidenciadas na UI | Não encontrado | Não | **PENDENTE P2** |
| Auditoria | Sim | Sim | Usada em ações críticas existentes | Sim | Pronto |
| Backup/restore | Restore documentado | Script de restore | Backup automático ausente | Ausente | **PENDENTE P1** |

## 6. Segurança e privacidade

### 6.1 Autenticação protegida

O `main` auditado contém comportamento que permite renderizar páginas protegidas sem sessão fora de `production`. Isso é incompatível com uma homologação exposta por túnel/rede. O PR #70 corrige o problema e deve preceder a homologação funcional com dados pessoais.

### 6.2 Clínico e MFA

O projeto exige `psychologist_owner` + AAL2/MFA para conteúdo clínico. A configuração negocial informada para homologação diz que MFA não será obrigatório globalmente. As duas regras podem coexistir se MFA for tratado como **step-up exclusivo do módulo clínico**, mas isso precisa ser conscientemente validado. Não é aceitável remover silenciosamente a proteção clínica só para facilitar testes.

### 6.3 Dados de homologação

A regra geral do repositório proíbe dados reais em desenvolvimento/teste. Para a rodada autorizada pelo patrocinador, este manual admite somente uma exceção controlada: os próprios dados pessoais do patrocinador/testador, usados conscientemente para validar entrega real. Dados de terceiros ou pacientes reais da cliente continuam proibidos.

Antes de produção, os registros pessoais de homologação devem ser apagados/anonimizados quando legal e tecnicamente possível e os backups que os contenham devem seguir a mesma política de retenção/eliminação.

## 7. Mensageria

O PR #67, já incorporado ao `main`, adicionou repositórios Supabase reais, outbox, tentativas, deduplicação de webhook, SMTP, Meta WhatsApp Cloud API e worker Node. O CI do head do PR ficou verde.

Duas condições ainda importam:

1. o demo auditado é anterior a esse código e não possuía o novo `solange-messaging-worker` em execução;
2. confirmações iniciadas pelo negócio fora da janela de atendimento do WhatsApp exigem template aprovado pela Meta; texto livre não deve ser tratado como solução de produção.

Para homologação, e-mail real pode ser validado com credencial temporária segregada. WhatsApp real somente deve ser marcado PASS quando token/número/template compatíveis estiverem configurados e o envio for comprovado no aparelho de teste.

## 8. Financeiro, eventos e fiscal

A auditoria encontrou um padrão importante: os módulos internos são mais completos que as telas administrativas atuais.

- `/financeiro`: lê recebíveis e pagamentos; não oferece ações reais de pagamento, estorno ou ajuste.
- `/eventos`: lê eventos, inscrições e capacidade; não oferece o ciclo administrativo completo prometido pelo fluxo do produto.
- `/fiscal`: lê a fila fiscal; não oferece criação operacional de solicitação NFS-e.
- `payables`: possui domínio/aplicação, mas não há tela administrativa correspondente.

Esses itens devem constar na homologação como **BLOCKED técnico**, e não como PASS derivado de unit tests.

## 9. Backup e restore — resposta objetiva

### O que existe

- `docs/operations/BACKUP_RESTORE.md`;
- meta de RPO de 24h e RTO de 4h para produção;
- orientação de restore isolado;
- `scripts/verify-backup-restore.sh`, que valida um dump existente em ambiente de restore;
- gate de go-live exigindo backup recente + exercício de restore;
- volume separado `/mnt/fredwin-backup` montado e com espaço disponível no host auditado.

### O que não existe/estava ativo

- script Solange responsável por **gerar** o backup lógico;
- systemd timer ou cron Solange agendando backup;
- evidência de arquivo de backup Solange no volume dedicado;
- evidência de restauração real a partir de backup gerado automaticamente.

Conclusão: **a rotina de backup foi prevista e o restore foi desenhado, mas o backup automático não estava operacionalmente incluído**. Isso precisa ser implementado e validado antes do encerramento da homologação e obrigatoriamente antes de produção.

## 10. Infraestrutura

- VM auditada online.
- Full stack Supabase local e containers do demo estavam saudáveis no preflight.
- Worker de documentos estava ativo.
- Disco raiz: aproximadamente 83% ocupado durante a auditoria; requer monitoramento para evitar que builds, logs ou dumps consumam o espaço restante.
- Volume separado de backup: aproximadamente 216 GB totais e 204 GB livres durante a auditoria.

## 11. PRs técnicos abertos observados

### PR #70 — autenticação real fora de produção

- natureza: segurança;
- CI: verde;
- efeito: impede fallback de staff sem sessão em staging/demo;
- prioridade: **P0 antes de dados pessoais na homologação**.

### PR #71 — no-show/cancelamento tardio e cobrança

- natureza: agenda + financeiro;
- CI: falha no E2E;
- falhas observadas: seletor Playwright ambíguo e receivable esperado não criado;
- revisão: havia comentários não resolvidos sobre preço ausente, idempotência concorrente, erros de lookup, snapshot de política e visibilidade do botão de cobrança;
- prioridade: **P1 antes de homologar cobrança de falta/cancelamento tardio**.

### PR #72 — agendamento automático da confirmação

- natureza: automação + mensageria;
- branch: divergente do `main` auditado;
- CI: sem evidência válida no head auditado;
- revisão: contrato booleano de enqueue/deduplicação precisava correção;
- prioridade: **P1 antes de homologar confirmação automática real**.

## 12. Veredito

### Pode iniciar testes agora?

**Sim, de forma controlada e faseada.**

Podem começar imediatamente os testes de infraestrutura/smoke e os fluxos já alcançáveis do demo, desde que não se confunda o SHA antigo implantado com o `main` atual.

Antes de usar dados pessoais do testador, deve ser incorporada/implantada a correção de autenticação equivalente ao PR #70.

A homologação final não pode ser encerrada enquanto permanecerem BLOCKED as rotinas obrigatórias de no-show/cobrança, confirmação automática, operações financeiras, eventos completos, fiscal de homologação e backup/restore real.

## 13. Sequência recomendada

1. Fixar o SHA candidato de homologação e atualizar o demo.
2. Incorporar a correção de autenticação.
3. Rodar CI/E2E e preflight no mesmo SHA implantado.
4. Executar Fase 0 e Fase 1 do manual com dados sintéticos.
5. Somente então utilizar dados do próprio testador para mensageria real.
6. Resolver e incorporar PRs técnicos necessários para as fases seguintes.
7. Implementar backup automático e provar restore isolado.
8. Reexecutar toda a matriz de regressão.
9. Registrar SHA homologado e evidências.
10. Manter os gates fiscais/jurídicos/credenciais definitivas como requisitos de go-live, não como impedimento para os testes já permitidos.
