# Data Model — v2

Este é o modelo conceitual alinhado à arquitetura v2. SQL/migrations concretas serão geradas task a task, preservando ownership por módulo.

## identity

### `profiles`
- `user_id uuid PK/FK auth.users`
- `role`: `psychologist_owner | secretary | accounting`
- `display_name`
- `active`
- timestamps

## people

### `people`
- `id uuid PK`
- `civil_name`
- `preferred_name`
- `cpf_normalized` único quando informado
- `birth_date`
- `email_normalized`
- `phone_e164`
- `preferred_channel`
- `birthday_messages_enabled`
- endereço fiscal estruturado
- timestamps

### `person_relationships`
Relaciona responsável legal, responsável financeiro e tomador fiscal quando diferente da pessoa atendida.

## appointments

### `services`
- nome
- duração padrão
- valor padrão em centavos
- ativo

### `cancellation_policies`
- versão
- antecedência em horas computáveis
- weekdays excluídos
- regras de cobrança configuráveis
- vigência

### `appointments`
- `id`
- `person_id`
- `service_id`
- `starts_at timestamptz`
- `ends_at timestamptz`
- `business_timezone`
- `status`
- `price_cents bigint`
- `cancellation_policy_version`
- `cancellation_deadline_at timestamptz`
- modalidade/local
- timestamps

### `appointment_status_history`
Histórico append-only de transições.

## forms/signatures

### `form_templates`
- id/nome/tipo
- classificação `administrative | sensitive`
- ativo/vigência

### `form_template_versions`
- template/version
- schema JSONB de perguntas/validações
- created_at

### `form_submissions`
- pessoa/agendamento/event registration
- template + versão
- estado `draft | submitted | signed | superseded`
- timestamps

### `form_submission_versions`
Para formulário administrativo: payload JSONB mínimo quando apropriado.

Para formulário `sensitive`:
- `answers_ciphertext`
- `answers_iv`
- `answers_auth_tag`
- `key_version`
- nenhum plaintext persistido

O envelope usa a infraestrutura de criptografia L3 e AAD vinculado ao ID da versão.

### `signature_evidence`
- submission/version
- `canonical_hash_sha256`
- declaration_version
- typed_name
- signature_asset_path opcional em storage privado
- signed_at
- metadata técnica sanitizada
- document status/path privado

### `capabilities`
- `token_hash`
- purpose
- subject ids
- expires_at
- revoked_at
- used_at

## receivables

### `receivables`
- id
- person/payer
- source_type/source_id
- original_amount_cents
- due_at
- status
- balance_cents derivado de pagamentos/ajustes com invariantes de consistência
- timestamps

### `payments`
- receivable_id
- amount_cents
- paid_at
- payment_method
- external_reference opcional
- status

### `receivable_adjustments`
Desconto, isenção, estorno/ajuste e outras correções permitidas, sempre com motivo e ator.

## payables

### `vendors`
Cadastro simples de fornecedor.

### `payables`
- vendor/category
- description
- amount_cents
- due_at
- recurrence_id opcional
- status

### `payable_payments`
Baixa de despesa e comprovante privado.

### `recurrence_rules`
Regra versionada para geração idempotente de despesas futuras.

## events

### `events`
- título/tipo
- starts_at/ends_at
- local/modalidade
- capacity
- default_price_cents
- status

### `event_registrations`
- event_id
- person_id
- status
- price_cents
- waitlist_position opcional
- attendance_status

### `event_expenses`
Referência a despesas/payables para cálculo de resultado.

## messaging

### `message_templates`
- key
- channel
- version
- content/metadata
- active

### `outbound_messages`
- person_id
- purpose
- template/version
- channel
- provider
- idempotency_key unique
- status
- provider_message_id
- timestamps

### `message_attempts`
Append-only por tentativa, sem conteúdo sensível desnecessário.

### `inbox_events`
- provider
- provider_event_id unique
- event_type
- payload sanitizado/referência
- received_at/processed_at

## fiscal

### `fiscal_profiles`
Dados do prestador versionados/configuráveis por ambiente e vigência.

### `fiscal_documents`
- source_type/source_id
- payer/person
- amount_cents
- provider/profile version
- idempotency_key
- external_id/protocol
- status
- issued_at/cancelled_at
- xml_path/pdf_path privados

### `fiscal_attempts`
Histórico de integração sanitizado.

## clinical

Tabelas clínicas vivem no schema `clinical`, fora da exposição direta padrão do API schema.

### `clinical.records`
- id
- appointment_id
- person_id
- author_user_id
- `ciphertext`
- `iv`
- `auth_tag`
- `key_version`
- created_at
- supersedes_id opcional

O texto clínico é criptografado no servidor antes da persistência. Chaves nunca ficam no banco nem chegam ao browser.

### `clinical.attachments`
Referência a objeto em bucket `clinical-private`, protegido por autorização reforçada e URLs assinadas curtas.

Não permitir acesso de secretaria/contabilidade.

## audit

### `audit_events`
- id
- actor_type/user_id
- action
- entity_type/entity_id
- correlation_id
- metadata sanitizada
- occurred_at

Append-only; nenhuma informação clínica bruta.

## queue/platform

Supabase Queues/PGMQ mantém filas duráveis: `messaging`, `automations`, `documents`, `fiscal`. Tabelas de attempts/outbox registram estado de negócio necessário; PGMQ é transporte e não fonte de verdade do domínio.

## Convenções

- UUID para IDs.
- `timestamptz` para instantes.
- `date` para nascimento.
- centavos em `bigint`.
- soft-delete/archive onde histórico é necessário.
- unique constraints para idempotência e deduplicação.
- `CHECK` constraints para invariantes simples.
- RLS default-deny para tabelas expostas.
- conteúdo L3 cifrado antes de persistir.
