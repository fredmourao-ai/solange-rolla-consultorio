# Audit

## Responsabilidade

The audit module owns the append-only public.audit_events table and the
sanitized audit event contract.

## Owns

Import src/modules/audit/public.ts only. Consumers submit actor, action,
entity, correlation and sanitized operational metadata.

## Public API

The public contract is exposed by public.ts and includes event creation and
sanitized metadata validation.

## Consumes

Recebe identidade do ator, ação, entidade, correlation id e metadados
operacionais através de public.ts.

## Invariantes

- Metadata is recursively checked and rejects content, answers, notes, tokens,
  secrets, diagnostics, clinical fields and raw signatures.
- Audit events are append-only and retain actor, entity, correlation and time.
- Audit events never contain clinical content or credentials.
- Database authorization remains the final enforcement layer.

## Dados sensíveis

O módulo não persiste conteúdo clínico, respostas de formulários, credenciais
ou tokens. O banco reforça o contrato por RLS e trigger de imutabilidade.

## Proibições

- Não registrar conteúdo clínico em metadata.
- Não usar console.log como substituto do audit log.
- Não permitir UPDATE ou DELETE de eventos.

## Security

All application roles may insert an event only for their own authenticated
actor. Reading the audit trail requires the owner role and AAL2. No application
role can update or delete an event.

## Testing

Domain tests cover metadata redaction. The 025_audit.sql pgTAP suite covers
RLS, forged actors and append-only behavior.
