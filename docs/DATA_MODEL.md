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
- `legal_document_version_id`
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

## forms/signatures/legal terms

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

### `legal_documents`
Documentos lógicos: `service_terms`, `cancellation_policy`, `truthfulness_declaration`, `privacy_notice`.

### `legal_document_versions`
- document id/key
- version
- content
- content hash SHA-256
- effective_from
- supersedes_id opcional
- flag/status de revisão/produção

### `legal_acceptances`
- person_id
- legal_document_version_id
- accepted_at
- signature_evidence_id opcional
- content_hash snapshot
- channel/capability metadata sanitizada

### `signature_evidence`
- submission/version
- `canonical_hash_sha256`
- declaration/legal versions incluídas no pacote assinado
- typed_name
- signature_asset_path opcional em storage privado
- signed_at
- metadata técnica sanitizada
- document status/path privado

### `document_jobs`
Outbox idempotente para geração assíncrona de comprovantes assinados.
- signature_evidence_id
- kind
- idempotency_key unique
- status
- dispatched_at
- attempts
- last_error_code
- completed_at

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
- status `open | partial | paid | overdue | refund_due | refunded | voided`
- timestamps

Valores calculados por projection/query transacional, não editáveis diretamente:
- `charge_amount_cents`: original + adjustments válidos
- `net_paid_cents`: payments - refunds efetivados
- `balance_cents`: valor ainda devido
- `refund_due_cents`: valor recebido que deve ser devolvido após redução/zeragem do charge

### `payments`
- receivable_id
- amount_cents
- paid_at
- payment_method
- external_reference opcional
- idempotency_key unique
- status

### `payment_refunds`
- payment_id
- amount_cents
- refunded_at
- refund_method
- reason
- external_reference opcional
- idempotency_key unique
- actor

Refund nunca apaga nem substitui o pagamento original; soma de refunds não pode exceder o payment.

### `receivable_adjustments`
Desconto, `cancellation_waiver`, isenção e outras correções de charge permitidas, sempre com motivo, ator e valor. Ajuste não é refund e não altera histórico de caixa.

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
Regra versionada para geração idempotente de despesas futuras, incluindo política explícita para dia inexistente no mês (`last_day` quando configurado).

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

### `fiscal_treatments`
Tratamento fiscal versionado por origem (`appointment_completed`, `appointment_late_cancellation`, `appointment_no_show`, `event_registration`, `other_service`), com regra de elegibilidade/emissão e habilitação live.

### `fiscal_documents`
- source_type/source_id
- payer/person
- amount_cents
- provider/profile version
- fiscal treatment/version
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
