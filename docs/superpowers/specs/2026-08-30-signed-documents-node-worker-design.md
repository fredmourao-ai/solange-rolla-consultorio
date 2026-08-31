# Signed Documents Node Worker Design

**Status:** Approved by product owner on 2026-08-30.

## Goal

Complete the signed-document delivery runtime with a persistent Node 24 worker that consumes the existing `documents` queue, decrypts signed form answers only in memory, renders one private PDF artifact, and atomically persists its result.

## Architecture

The worker runs outside the request path. It uses the existing service-role Supabase client, `createServerSupabaseQueueBackend`, `createSensitiveDataCrypto`, `renderSignedFormPdf`, and `renderSignedDocument` application service.

A new signatures infrastructure adapter owns the read model required to render a signed document. A new Supabase private-storage adapter owns upload/signed-URL operations. The worker loop composes those adapters and `drainDocumentQueue` without duplicating business logic.

The runtime is packaged as a restartable Docker process on the authorized VM. The existing Supabase Edge Function stub remains non-authoritative and is not used to render documents.

## Security invariants

- Signed submission immutability is never disabled or bypassed.
- L3 plaintext exists only as an in-memory string/object and PDF buffer during one job execution.
- Queue payload contains only `jobId`, idempotency/correlation metadata, never form answers.
- Plaintext is never written to `/tmp`, project files, structured logs, queue messages, or database columns.
- Storage bucket is `signed-documents-private` and upload uses `upsert: false`.
- Worker uses service-role credentials only in its private runtime environment.
- No Supabase Studio, database port, service key, or encryption key is exposed publicly.

## Processing contract

1. Read up to a bounded batch from queue `documents` with a visibility timeout longer than one render attempt.
2. Reject malformed messages by archiving them without touching signed data.
3. Load the `document_jobs` row and linked `signature_evidence`.
4. If the job is already completed with a complete artifact, return it without upload.
5. Load the exact immutable `form_submission_versions` row referenced by the evidence and its template schema/name/version.
6. For sensitive forms, reconstruct an AES-GCM envelope and decrypt with context `{ entity: 'form_submission', id: submissionId }`; administrative answers stay as stored JSON.
7. Map template field keys to labels and render the PDF in memory.
8. Upload to opaque path `signed/<evidenceId>/<jobId>.pdf` with `upsert: false`.
9. Persist ready/hash/byteLength atomically through `persist_document_job_result`; classify storage/network errors as retryable and integrity/render errors as final.
10. Archive the queue message only after terminal state persistence; retryable jobs are requeued.

## Idempotency and crash behavior

`document_jobs.idempotency_key` remains the logical deduplication key. Reprocessing a completed job returns the persisted artifact and performs no second upload. A crash after queue delivery but before archive is safe because a second execution observes the persisted terminal job state.

If upload succeeds but result persistence fails, the same opaque path may already exist on retry. The storage adapter must treat an existing object as success only after verifying that persisted job/evidence metadata already describes that exact artifact; otherwise the worker reports a retryable persistence/storage conflict instead of overwriting.

## Operations

The worker runs as a Docker container with `--restart unless-stopped`, on host networking, using an env file with mode `0600`. Health is represented by process/container state plus recent successful poll timestamp; the web demo remains independent so a worker failure cannot take the presentation offline.

The demo/preflight command will check the worker container and run one synthetic end-to-end document generation against the isolated demo Supabase stack before presentation use.