# Arquitetura Oficial — Sistema Solange Rolla

Status: **proposta arquitetural v2 para aprovação e execução**  
Data: 2026-08-24  
Fonte de verdade: este repositório privado.

## 1. Decisão arquitetural

O sistema será um **monólito modular orientado a domínio**, com PostgreSQL/Supabase como fonte única de verdade e processamento assíncrono por filas duráveis.

Não adotaremos microserviços nesta fase. Os limites entre módulos serão fortes no código, banco, contratos e testes, permitindo extração futura de um módulo sem reescrever o restante do sistema.

### Motivos

- volume operacional inicial baixo/moderado;
- dados de saúde exigem menos superfícies de ataque, não mais;
- vários agentes precisam trabalhar em paralelo sem compartilhar arquivos centrais;
- transações de agenda, financeiro e auditoria se beneficiam de um único banco relacional;
- Supabase oferece Auth, RLS, Storage, Queues, Cron e Edge Functions sobre Postgres;
- simplifica backup, restauração, observabilidade e homologação.

## 2. Princípios não negociáveis

1. **Privacy by design** desde a primeira migration.
2. **Default deny** para autorização e exposição de dados.
3. Dados clínicos são tecnicamente segregados dos administrativos.
4. Agenda, financeiro e fiscal possuem estados independentes.
5. Paciente e participante de evento usam o mesmo cadastro de Pessoa.
6. Nenhuma integração externa participa da transação principal do usuário.
7. Toda chamada externa importante é assíncrona, idempotente e auditável.
8. Formulário assinado é imutável; correções geram nova versão.
9. Regras de negócio históricas são versionadas e persistidas no registro afetado.
10. Dinheiro nunca usa ponto flutuante.
11. Datas de negócio usam `America/Sao_Paulo`; persistência usa `timestamptz`/UTC.
12. Nenhum agente modifica `main` diretamente após o bootstrap.
13. Nenhum dado real de paciente entra em fixture, teste, log ou issue.

## 3. Stack-alvo

### Aplicação

- Next.js App Router + TypeScript.
- React Server Components por padrão.
- Server Actions/use-cases para mutações administrativas.
- Route Handlers apenas para APIs públicas controladas e webhooks.
- Tailwind + componentes acessíveis; UI otimizada para público idoso.

### Dados e plataforma

- Supabase/PostgreSQL em região específica **South America — São Paulo (`sa-east-1`)**.
- Supabase Auth para equipe interna.
- RLS em todas as tabelas expostas.
- MFA obrigatório para usuários internos em produção.
- Supabase Storage com buckets privados.
- Supabase Queues (`pgmq`) para tarefas duráveis.
- Supabase Cron (`pg_cron`) para agendamentos e disparo de workers.
- Supabase Edge Functions ou worker compatível para consumidores assíncronos.

### Entrega

- GitHub privado.
- Vercel para frontend/API web.
- Supabase para banco, autenticação, storage, cron, filas e funções.
- Ambientes separados: local, staging e production.

## 4. Topologia lógica

```text
Usuário interno
   |
   v
Next.js Web
   |
   +--> Application Use Cases
   |       |
   |       v
   |    Domain Modules
   |       |
   |       v
   +--> Supabase/PostgreSQL <---- Audit
              |
              +--> Queues (pgmq)
              |       |
              |       v
              |    Async Workers
              |       |
              |       +--> WhatsApp
              |       +--> Email
              |       +--> NFS-e
              |       +--> Document generation
              |
              +--> Cron
              +--> Storage privado

Paciente/participante
   |
   +--> link de capacidade de uso único/escopo limitado
            |
            v
      páginas públicas restritas
      (formulário, confirmação, cancelamento)
```

## 5. Estrutura do código

```text
src/
  app/                         # composição Next.js; sem regra de negócio
  modules/
    identity/
    people/
    appointments/
    forms/
    signatures/
    messaging/
    receivables/
    payables/
    events/
    fiscal/
    clinical/
    automations/
    reports/
    audit/
  platform/
    supabase/
    queue/
    storage/
    observability/
  shared/
    kernel/                    # tipos realmente universais
    ui/                        # componentes sem regra de negócio

supabase/
  migrations/
  functions/
  seed/

docs/
  adr/
  agents/
```

Cada módulo possui, quando necessário:

```text
module/
  domain/          # regras puras, estados, políticas
  application/     # casos de uso, comandos e queries
  infrastructure/  # persistência e adaptadores internos
  ui/              # componentes específicos do módulo
  public.ts        # única API pública importável por outros módulos
  README.md        # invariantes e ownership
```

### Regra de dependência

```text
UI -> Application -> Domain
Infrastructure -> interfaces definidas pelo Application/Domain
```

- `domain` não importa Next.js, Supabase, SDKs ou UI.
- um módulo nunca importa `infrastructure` de outro módulo;
- dependência entre módulos ocorre por `public.ts`, IDs e contratos/eventos explícitos;
- `shared/` não pode virar depósito genérico.

## 6. Módulos e ownership

### identity
Equipe interna, sessão, papel, MFA e autorização.

### people
Cadastro único de pessoas, dados fiscais, responsável legal/financeiro, preferências de contato e nascimento.

### appointments
Consultas, agenda, recorrência, confirmação, reagendamento, cancelamento, falta e política versionada de antecedência.

### forms
Templates versionados, respostas, progresso e preenchimento por link seguro.

### signatures
Congelamento do documento, canonicalização, hash SHA-256, evidências e assinatura simples.

### receivables
Contas a receber, cobrança de consultas/eventos, pagamentos, baixa, desconto, isenção e inadimplência.

### payables
Contas a pagar, categorias, recorrência, comprovantes e fluxo de caixa.

### events
Eventos, agenda, inscrições, participantes, lista de espera, presença e resultado financeiro.

### messaging
Orquestração de WhatsApp/e-mail, templates, preferências e delivery status.

### fiscal
NFS-e por adaptador, tomador, emissão, consulta, cancelamento, PDF/XML e auditoria fiscal.

### clinical
Registro psicológico e anexos clínicos; acesso exclusivo da psicóloga e MFA reforçado.

### automations
Aniversários, confirmação 24h antes, lembretes, rotinas programadas e criação de tarefas para secretaria.

### reports
Read models e relatórios administrativos/financeiros/fiscais, sem conteúdo clínico.

### audit
Trilha de auditoria imutável e separada de logs técnicos.

## 7. Modelo de dados e schemas

O modelo será SQL-first com migrations Supabase. Não usaremos ORM como fonte de verdade do schema.

### Regras

- migrations aplicadas são imutáveis;
- correções usam nova migration;
- tipos TypeScript são gerados a partir do schema;
- chaves primárias UUID;
- foreign keys explícitas;
- `created_at`, `updated_at` onde fizer sentido;
- entidades regulatórias/financeiras usam cancelamento/arquivamento lógico, não `DELETE` destrutivo.

### Classificação de dados

- **L0 Público:** serviços e informações institucionais.
- **L1 Interno:** agenda e operação sem conteúdo sensível clínico.
- **L2 Pessoal/financeiro/fiscal:** CPF, endereço, pagamentos, documentos fiscais.
- **L3 Sensível:** saúde, formulário clínico, registro psicológico, anexos clínicos.
- **L4 Segredos:** tokens, chaves, credenciais de provedores.

Cada nível exige controles cumulativos.

## 8. Segurança e autorização

### Equipe interna

Papéis iniciais:

- `psychologist_owner`
- `secretary`
- `accounting`

Produção exige MFA (`aal2`) para equipe interna. Acesso clínico exige simultaneamente:

1. usuário autenticado;
2. papel `psychologist_owner`;
3. sessão em `aal2`;
4. policy RLS autorizando linha/operação.

### RLS

- RLS ativado em toda tabela exposta;
- políticas default-deny;
- testes positivos e negativos obrigatórios;
- `service_role` nunca é usado para operações iniciadas por usuário;
- workers podem usar credenciais privilegiadas somente para filas/rotinas definidas e com APIs internas limitadas.

### Storage

Buckets separados:

- `signed-documents-private`
- `fiscal-documents-private`
- `financial-receipts-private`
- `clinical-private`

Objetos clínicos exigem papel da psicóloga e MFA. URLs assinadas são curtas e específicas.

## 9. Acesso sem login para pacientes

Pacientes não terão conta no MVP.

Será usado **capability link** de escopo mínimo:

1. token aleatório criptograficamente forte;
2. banco armazena somente hash do token;
3. token possui finalidade, pessoa/agendamento, expiração e revogação;
4. primeiro acesso troca token por cookie HttpOnly/Secure/SameSite;
5. navegador é redirecionado para URL limpa sem token;
6. token bruto nunca entra em log;
7. após assinatura/conclusão, capacidade é revogada ou reduzida.

Capacidades distintas para:

- preencher formulário;
- confirmar consulta;
- solicitar reagendamento;
- cancelar consulta;
- visualizar documento autorizado.

## 10. Formulários e assinatura

Templates são versionados. Respostas clínicas podem ser armazenadas em JSONB versionado, sem transformar cada pergunta em coluna permanente.

Ao assinar:

1. validar campos e identidade declarada;
2. gerar representação canônica do conteúdo;
3. congelar versão e respostas;
4. gerar hash SHA-256;
5. registrar declaração aceita, nome digitado/assinatura desenhada, data/hora e evidências técnicas;
6. gerar PDF comprovante;
7. armazenar documento em bucket privado;
8. impedir `UPDATE`/`DELETE` da versão assinada por regra de aplicação + banco.

Correção posterior gera nova versão vinculada à anterior.

## 11. Agenda e política de cancelamento

`AppointmentStatus` e `FinancialStatus` são independentes.

Política inicial:

- antecedência: 48 horas computáveis;
- sábado e domingo não contam;
- cálculo na timezone `America/Sao_Paulo`;
- persistir `policy_version` e `cancellation_deadline_at` na consulta;
- mudança futura da política não recalcula registros históricos.

Estados principais:

```text
scheduled
pending_confirmation
confirmed
reschedule_requested
rescheduled
cancelled_in_time
cancelled_late
completed
no_show
cancelled_by_provider
```

Transições inválidas são rejeitadas por máquina de estados, não por convenção de UI.

## 12. Financeiro

Dinheiro é armazenado em **centavos inteiros** (`bigint`) para valores monetários. Percentuais/impostos usam `numeric` com escala explícita.

Agenda não marca pagamento diretamente. Fluxo:

```text
appointment/event registration
        |
        v
receivable
        |
        +--> payment(s)
        |
        v
financial status
```

Suporta:

- pagamento integral/parcial;
- múltiplos meios;
- desconto;
- isenção justificada;
- estorno;
- pagamento agrupado;
- contas vencidas;
- despesas recorrentes;
- realizado e projetado.

## 13. Eventos

Evento é entidade diferente de consulta, compartilhando Pessoa, Financeiro, Formulários, Mensageria e Fiscal.

```text
Event
  +--> Registration
         +--> Person
         +--> Receivable
         +--> Form/Signature (opcional)
         +--> Attendance
         +--> Fiscal document
```

Um evento ocupa um item de agenda; participantes não duplicam o evento no calendário.

## 14. Arquitetura assíncrona

Nenhum clique do usuário deve depender da disponibilidade de WhatsApp, e-mail ou NFS-e.

### Filas

Filas duráveis iniciais:

- `messaging`
- `fiscal`
- `documents`
- `automations`

A mutação de negócio e o enqueue ocorrem na mesma transação Postgres quando possível.

Workers:

1. leem mensagem;
2. validam idempotency key;
3. executam integração;
4. persistem tentativa/resultado;
5. arquivam a mensagem em sucesso;
6. em falha recuperável, liberam para retry com backoff;
7. após limite, enviam para estado de falha operacional visível no dashboard.

### Idempotência

Obrigatória para:

- envio de mensagens;
- webhooks;
- emissão/cancelamento fiscal;
- geração de documentos;
- jobs de aniversário;
- rotinas de confirmação.

## 15. Inbox para webhooks

Todo webhook externo segue:

```text
Provider -> Route Handler -> inbox_events -> queue -> processor
```

`provider_event_id` possui unique constraint. O endpoint responde rapidamente e não executa regra de negócio pesada inline.

## 16. Agendamentos automáticos

Cron apenas identifica trabalho e enfileira jobs; não envia mensagens diretamente.

Rotinas:

- confirmação 24h antes;
- aviso de prazo de cancelamento configurável;
- aniversários;
- reprocessamentos;
- verificação de pendências operacionais.

## 17. Mensageria

Porta pública:

```ts
interface MessagingProvider {
  send(input: OutboundMessage): Promise<DeliveryResult>
}
```

Adaptadores iniciais:

- WhatsApp Business Platform;
- e-mail transacional.

Regras:

- conteúdo clínico nunca sai por mensagem;
- templates identificados por versão;
- mensagens administrativas neutras;
- preferência de canal por pessoa;
- WhatsApp como principal quando configurado; e-mail como fallback conforme política;
- eventos de entrega/leitura são registrados quando o provedor disponibilizar.

## 18. Fiscal/NFS-e

Porta pública:

```ts
interface NfseProvider {
  issue(input: NfseIssueInput): Promise<NfseIssueResult>
  getStatus(externalId: string): Promise<NfseStatusResult>
  cancel(input: NfseCancelInput): Promise<NfseCancelResult>
}
```

O domínio nunca chama SDK fiscal diretamente.

- sandbox/mock obrigatório antes de live;
- feature flag `NFSE_LIVE_ENABLED=false` por padrão;
- idempotency key por operação;
- XML/PDF em storage privado;
- respostas do provedor sanitizadas antes de log;
- regra fiscal de falta/cancelamento será configurável conforme validação contábil/jurídica, não presumida pelo código.

## 19. Dados clínicos

O módulo clínico é o mais restrito.

- nenhuma dependência de `reports`, `messaging` ou `fiscal` sobre conteúdo clínico;
- secretaria e contabilidade recebem `403/permission denied` inclusive por acesso direto;
- auditoria de leitura e escrita;
- anexos em bucket exclusivo;
- buscas globais não indexam conteúdo clínico;
- nenhum APM/log recebe texto clínico;
- exportação exige fluxo explícito e auditado.

## 20. Auditoria versus observabilidade

### Audit log

Registra fatos de negócio/segurança:

- login relevante;
- acesso clínico;
- alteração de cadastro;
- assinatura;
- pagamento/estorno/isenção;
- cancelamento de consulta;
- emissão/cancelamento fiscal;
- alteração de papel/permissão.

Campos mínimos: ator, ação, tipo/id da entidade, timestamp, request/correlation id e metadata sanitizada.

### Log técnico

Estruturado em JSON e sem PII desnecessária.

Nunca logar:

- CPF completo;
- respostas de formulário;
- conteúdo clínico;
- token de capability link;
- secrets;
- XML fiscal bruto contendo PII.

## 21. Ambientes

```text
LOCAL -> STAGING -> PRODUCTION
```

Cada ambiente possui:

- projeto Supabase independente;
- banco independente;
- chaves independentes;
- storage independente;
- configuração de provedores independente.

Staging usa somente dados sintéticos. Produção nunca é banco de testes.

## 22. Backup e recuperação

Produção deve usar plano Supabase com backup automático. Política adicional:

- backup diário da plataforma;
- dump lógico externo criptografado em frequência definida antes do go-live;
- restauração testada periodicamente em ambiente isolado;
- runbook de disaster recovery;
- PITR será habilitado quando custo/criticidade justificar, sem alterar arquitetura.

Backup não é considerado válido até existir teste de restauração.

## 23. CI/CD

`main` deve ser protegida por ruleset GitHub:

- pull request obrigatório;
- impedir force push e deleção;
- checks obrigatórios;
- revisão obrigatória para áreas críticas quando houver revisores independentes;
- CODEOWNERS para arquivos críticos;
- branch atualizada antes do merge quando necessário.

Checks planejados:

```text
lint
typecheck
unit
domain-state-tests
integration
rls-security-tests
migration-check
build
playwright-smoke
secret-scan
dependency/security scan
```

## 24. Estratégia de testes

### Unit
Regras puras: datas, política de cancelamento, dinheiro, estados, descontos, idempotência.

### Integration
Casos de uso + Postgres/Supabase local.

### Authorization/RLS
Matriz explícita para psicóloga, secretaria, contabilidade e anônimo.

### Contract
Adaptadores WhatsApp, e-mail e NFS-e contra mocks/fixtures controladas.

### E2E
Fluxos críticos:

1. pessoa -> consulta -> formulário -> assinatura -> confirmação -> pagamento -> fiscal;
2. evento -> inscrição -> pagamento -> presença -> fiscal;
3. secretaria tentando acessar clínico deve falhar;
4. retry não pode duplicar mensagem/pagamento/NFS-e.

## 25. Acessibilidade e UX

Formulários de paciente devem priorizar idosos:

- mobile-first;
- fonte legível;
- alto contraste;
- alvos de toque grandes;
- uma ação principal por tela;
- linguagem simples;
- salvar e continuar;
- nenhuma conta/senha obrigatória;
- assinatura por nome digitado ou dedo;
- mensagens de sucesso inequívocas.

Meta: WCAG 2.2 AA nas interfaces públicas principais.

## 26. Arquitetura para agentes

Toda tarefa nasce como GitHub Issue/Task Contract contendo:

- objetivo;
- escopo permitido;
- caminhos permitidos;
- caminhos proibidos;
- contratos consumidos/produzidos;
- testes de aceitação;
- dependências;
- riscos e nível de sensibilidade.

Cada agente trabalha em branch/worktree próprio. Uma tarefa = um PR.

Mudanças em:

- contratos públicos;
- migrations compartilhadas;
- segurança/RLS;
- fiscal;
- política jurídica;
- modelo de estados;

exigem atualização de ADR ou aprovação arquitetural explícita.

## 27. O que deliberadamente não faremos agora

- microserviços;
- event sourcing;
- Kafka/RabbitMQ/Redis só por arquitetura;
- Kubernetes;
- data warehouse;
- app nativo;
- conta de paciente completa;
- Google Calendar como fonte de verdade;
- IA lendo prontuário clínico por padrão;
- integração bancária antes do financeiro básico estar homologado.

## 28. Critérios para extrair um serviço no futuro

Um módulo só vira serviço separado quando houver pelo menos um motivo mensurável:

- necessidade de escala independente;
- limite de runtime/deploy incompatível;
- isolamento regulatório/segurança adicional;
- equipe independente com cadência própria;
- indisponibilidade do módulo não pode afetar o restante;
- tecnologia diferente realmente necessária.

Até lá, fronteiras modulares fornecem isolamento suficiente com muito menos custo operacional.

## 29. Fontes técnicas atuais usadas na decisão

- Supabase Regions: https://supabase.com/docs/guides/platform/regions
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase MFA: https://supabase.com/docs/guides/auth/auth-mfa
- Supabase Queues: https://supabase.com/docs/guides/queues
- Supabase Cron: https://supabase.com/docs/guides/cron
- Supabase Backups: https://supabase.com/docs/guides/platform/backups
- GitHub Rulesets: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
- GitHub CODEOWNERS: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- ANPD — materiais e guias: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes

## 30. Regra final

**O banco guarda verdade; o domínio decide regras; filas desacoplam integrações; RLS protege dados; ADRs protegem decisões; CI protege a `main`; módulos protegem agentes uns dos outros.**
