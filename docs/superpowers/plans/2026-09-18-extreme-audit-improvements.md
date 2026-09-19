# Extreme audit improvements - 2026-09-18

Approved scope: harden staging diagnostics/housekeeping/ownership and add clinically protected structured health context to the longitudinal record.

## Runtime
- Staging Next server listens on 127.0.0.1:3200. Diagnostics use that port and fail closed.
- Disk >=95% is critical. Housekeeping is idempotent, supports --dry-run, preserves the deployed candidate and only removes known obsolete staging artifacts.
- Post-promotion ownership gate rejects unexpected non-runner-owned files under app; secrets/state outside app are not blindly chowned.
- The staging web process runs with the runner UID/GID so runtime caches cannot recreate root-owned app artifacts.

## Clinical health context
- Structured health/anamnesis data lives in the dedicated `clinical.medical_histories` table, never in `public.people`.
- Every revision is AES-256-GCM encrypted with a record-specific associated-data context and is immutable after insert.
- Revisions form a single non-forking supersede chain per patient. The previous revisions remain readable to the authorized clinician and cannot be updated or deleted.
- Access is restricted to `psychologist_owner` at AAL2 with the existing `clinical.read`, `clinical.create` and `clinical.supersede` permission boundaries. Secretary, accounting, anonymous and owner-at-AAL1 paths are negative-tested.
- The record stores only non-sensitive source metadata (`clinician_review` or `patient_signed_form_review`, plus an optional source reference). Patient self-report is not automatically promoted to clinician-verified fact.
- Audit events contain only identifiers, revision and source metadata. Clinical plaintext is excluded from audit metadata, URLs and administrative handoffs.
- The longitudinal clinical summary prefers the current dedicated medical-history revision while preserving compatibility with older session payloads that may contain health-context fields.

## Validation
- Real UI homologation covers synthetic patient -> MFA/AAL2 -> session evolution -> dedicated medical-history creation -> reload persistence -> superseding revision -> longitudinal summary.
- E2E verifies ciphertext and audit metadata do not contain the synthetic allergy plaintext.
- Database pgTAP coverage verifies RLS, role/AAL denials, immutable revisions, non-forking supersede behavior and preserved history.

## MaxListeners warning
Fresh staging logs reproduce `MaxListenersExceededWarning` on Gzip with Next 16.3.4. Upstream Next.js issue #97757 documents the same 16.3.x regression in self-hosted `next start`. We do not mask it with `setMaxListeners`. Re-test when an upstream stable fix lands; use trace warnings for future diagnostics.
