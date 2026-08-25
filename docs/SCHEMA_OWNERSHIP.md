# Schema Ownership

SQL migrations are the source of truth for the database schema. Every new
migration must use the forward-only filename format
`YYYYMMDDHHMMSS_description.sql`; a migration that has reached the base branch
is immutable and is corrected only by a later migration.

The migration that creates or materially changes an owned table must state the
owner in a SQL comment and follow the owner listed below. A module consumes
another module's data through its public contract, documented view/read model,
or an event. A foreign key does not grant write ownership.

## Foundation Ownership

| Schema or object | Owner | Boundary |
| --- | --- | --- |
| PostgreSQL extensions | `platform` | Foundation configuration only; domain modules do not alter extensions directly. |
| `pgmq` schema and its queue tables | `platform` | Queue storage is private infrastructure, not an application API. |
| `public.queue_send`, `public.queue_read`, `public.queue_archive`, `public.queue_requeue` | `platform` | The platform queue contract owns validation and access to PGMQ. Modules submit/consume envelope payloads through this contract. |
| `messaging`, `automations`, `documents`, and `fiscal` queue names | `platform` | Queue transport and functions remain platform-owned; the named module owns the message kind and consumer behavior. |
| `capabilities` | `forms` | Capability lifecycle is exposed through the forms/signatures public contracts; token hashes, never raw tokens, are persisted. |

`automations` owns scheduler behavior and job creation, not the tables of the
modules it invokes. It uses public contracts and the platform queue boundary.

## Module Tables

| Owner | Schema/table | Migration description prefix |
| --- | --- | --- |
| `identity` | `public.profiles` | `identity` |
| `people` | `public.people`, `public.person_relationships` | `people` |
| `appointments` | `public.services`, `public.cancellation_policies`, `public.appointments`, `public.appointment_status_history` | `appointments` |
| `forms` | `public.form_templates`, `public.form_template_versions`, `public.form_submissions`, `public.form_submission_versions`, `public.legal_documents`, `public.legal_document_versions`, `public.legal_acceptances` | `forms`, `legal_terms` |
| `signatures` | `public.signature_evidence`, `public.document_jobs` | `signatures`, `document_jobs` |
| `receivables` | `public.receivables`, `public.payments`, `public.payment_refunds`, `public.receivable_adjustments` | `receivables`, `payments` |
| `payables` | `public.vendors`, `public.payables`, `public.payable_payments`, `public.recurrence_rules` | `payables` |
| `events` | `public.events`, `public.event_registrations`, `public.event_expenses` | `events` |
| `messaging` | `public.message_templates`, `public.outbound_messages`, `public.message_attempts`, `public.inbox_events` | `messaging`, `appointment_confirmation` |
| `fiscal` | `public.fiscal_profiles`, `public.fiscal_treatments`, `public.fiscal_documents`, `public.fiscal_attempts` | `fiscal` |
| `audit` | `public.audit_events` | `audit` |
| `reports` | `reports.*` views and read models only | `reports` |

## Clinical Isolation

The clinical schema is exclusively owned by `clinical`. Its tables are
`clinical.records` and `clinical.attachments`, with clinical-private storage
objects governed by the same owner. No other module, report, queue consumer,
or administrative role may query, write, export, or replicate clinical
content. Clinical migrations require the security/RLS review defined in
`AGENTS.md`, including positive psychologist-owner and negative secretary,
accounting, and anonymous tests.

## Cross-Module Changes

Changing a table owned by another module requires a cross-module Task Contract
before the migration is written. The contract must name the table owner,
consumer, public contract or event used, migration/rollback plan, and required
reviewers. The table owner reviews every such migration; clinical changes also
require security/RLS review, and financial or fiscal changes require the
corresponding domain review.

An ownership transfer, a new shared schema, or a change to the source of truth
requires an ADR and an update to this document before implementation.
