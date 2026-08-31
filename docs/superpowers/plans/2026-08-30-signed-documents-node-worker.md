# Signed Documents Node Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make signed-document jobs actually produce private PDFs through a persistent Node 24 worker, with in-memory decryption, retry safety, and an end-to-end verified demo runtime.

**Architecture:** Compose the existing queue, AES-GCM crypto, PDF renderer, result RPC, and private Storage behind focused Supabase adapters. Run a bounded polling loop as a restartable Docker worker on the authorized VM; the web process remains independent.

**Tech Stack:** Node 24.19, TypeScript 5.9 compiler, Supabase JS 2.112, Supabase Queues RPCs, Supabase Storage, pdf-lib, Vitest, Playwright, Docker.

**Spec:** `docs/superpowers/specs/2026-08-30-signed-documents-node-worker-design.md`

## Global Constraints

- Signed submission immutability is never disabled or bypassed.
- Plaintext L3 exists only in memory and never in files, logs, queue payloads, or persisted plaintext columns.
- Queue `documents` payload contains only IDs/references plus idempotency/correlation metadata.
- Final PDF stays in `signed-documents-private` at `signed/<evidenceId>/<jobId>.pdf`.
- Storage writes never overwrite an existing differing object.
- Worker secrets stay in a private `0600` env file and are never printed.
- Web demo availability must not depend on worker availability.

---

### Task 1: Signed-document repository and deterministic source loading

**Files:**
- Create: `src/modules/signatures/infrastructure/supabase-signed-document-repository.ts`
- Create: `src/modules/signatures/infrastructure/supabase-signed-document-repository.test.ts`
- Modify: `src/modules/signatures/infrastructure/pdf-renderer.ts`
- Modify: `src/modules/signatures/infrastructure/pdf-renderer.test.ts`
- Modify: `src/modules/signatures/public.ts`

**Interfaces:**
- Produces `createSupabaseSignedDocumentRepository(client?, crypto?): SignedDocumentRepository`.
- Consumes `SensitiveDataCrypto.decrypt(envelope, { entity: 'form_submission', id: submissionId })`.
- Produces deterministic PDF bytes for identical signed input by fixing PDF creation/modification timestamps to `signedAt`.
- [ ] **Step 1: Write failing repository tests**

Cover: exact evidence/version/template lookup; sensitive answers are decrypted with submission-scoped AAD; administrative answers stay JSON; field labels follow the signed template schema; missing/corrupt envelope throws `DOCUMENT_SOURCE_INTEGRITY_ERROR`; no plaintext appears in repository call diagnostics.

- [ ] **Step 2: Run the targeted tests and verify RED**

Run: `npx vitest run src/modules/signatures/infrastructure/supabase-signed-document-repository.test.ts src/modules/signatures/infrastructure/pdf-renderer.test.ts`
Expected: FAIL because the repository factory/deterministic metadata do not exist yet.

- [ ] **Step 3: Implement minimal repository**

`findJob()` selects job + linked evidence artifact metadata. `loadSource()` selects the immutable submission version, submission/template version/template name, decrypts only when ciphertext fields are present, validates that answers are a record, then maps schema field `{ key, label }` to `{ label, value }`. `markReady()` and `markFailed()` call `persist_document_job_result`.

- [ ] **Step 4: Make PDF output deterministic**

Before `document.save()`, set creation/modification date from `input.signedAt`; preserve the existing title/subject/creator. Test two renders of identical input produce identical SHA-256 hashes.

- [ ] **Step 5: Run targeted tests and commit**

Run the targeted Vitest command plus `npm run typecheck && npm run lint`.
Commit: `feat: add signed document source repository`

---

### Task 2: Idempotent private Storage adapter

**Files:**
- Create: `src/modules/signatures/infrastructure/supabase-signed-document-storage.ts`
- Create: `src/modules/signatures/infrastructure/supabase-signed-document-storage.test.ts`
- Modify: `src/modules/signatures/application/render-signed-document.ts`
- Modify: `src/modules/signatures/application/render-signed-document.test.ts`
- Modify: `src/modules/signatures/public.ts`

**Interfaces:**
- Produces `createSupabaseSignedDocumentStorage(client?): { put(path, body, options): Promise<void>; createShortLivedDownloadUrl(path): Promise<string> }`.
- Existing-object recovery accepts a duplicate upload only when downloaded bytes hash exactly matches the candidate buffer; otherwise throws `DOCUMENT_STORAGE_CONFLICT`.

- [ ] **Step 1: Write failing Storage tests**

Cover successful private upload with `upsert: false`; duplicate + identical bytes resolves successfully; duplicate + different bytes throws conflict; signed URL TTL is at most 300 seconds; path validation rejects non-opaque paths.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/modules/signatures/infrastructure/supabase-signed-document-storage.test.ts src/modules/signatures/application/render-signed-document.test.ts`
Expected: FAIL because the adapter and duplicate reconciliation do not exist.

- [ ] **Step 3: Implement adapter and retry-safe rendering**

Use `client.storage.from('signed-documents-private').upload(path, bytes, { contentType: 'application/pdf', upsert: false })`. On conflict, download the existing object, compare SHA-256 to candidate bytes, and only treat as success when hashes match. Keep `renderSignedDocument()` returning a persisted completed artifact without any Storage call.

- [ ] **Step 4: Run targeted tests and commit**

Run targeted Vitest plus `npm run typecheck && npm run lint`.
Commit: `feat: make signed document storage idempotent`

---

### Task 3: Persistent Node worker runtime

**Files:**
- Create: `src/workers/document-worker-runtime.ts`
- Create: `src/workers/document-worker-runtime.test.ts`
- Create: `scripts/document-worker.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`

**Interfaces:**
- Produces `processDocumentJob(jobId, dependencies): Promise<'completed'|'retry'|'failed_final'>`.
- Produces `runDocumentWorker({ signal, pollMs, batchSize }): Promise<void>`.
- Runtime composes `createQueue({ name: 'documents', backend: createServerSupabaseQueueBackend() })`, signed repository/storage, `renderSignedFormPdf`, and `drainDocumentQueue`.
- Adds `npm run worker:documents` using `tsc -p tsconfig.worker.json` and Node `--conditions=react-server`.

- [ ] **Step 1: Write failing runtime tests**

Cover: completed render archives the queue job; `DOCUMENT_STORAGE_FAILED`/database connectivity requeues with 60s delay; integrity/render failures archive after final state; malformed queue message never calls renderer; polling loop stops cleanly on `AbortSignal`; logs contain IDs/status codes only and never the sentinel `SIGNED_DOC_SENSITIVE_SENTINEL`.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/workers/document-worker-runtime.test.ts supabase/functions/document-worker/index.test.ts`
Expected: FAIL because the Node runtime is absent.

- [ ] **Step 3: Implement process wrapper and bounded loop**

Map terminal successful render to `completed`; map storage/network/RPC transient failures to `retry`; map `DOCUMENT_RENDER_FAILED`, `DOCUMENT_SOURCE_INTEGRITY_ERROR`, and artifact conflicts to `failed_final`. Poll at a minimum of 250ms, default 2000ms, batch default 5, visibility timeout 120s. No error object with source payload is serialized to logs.

- [ ] **Step 4: Add executable entrypoint**

`scripts/document-worker.ts` installs SIGINT/SIGTERM handlers, validates `serverEnv()` and encryption keyring at startup, then invokes the runtime. Add `tsconfig.worker.json`, compile to CommonJS with the pinned TypeScript compiler, and run Node with `--conditions=react-server` so existing `server-only` guards remain intact.

- [ ] **Step 5: Run targeted tests and commit**

Run runtime tests plus `npm run typecheck && npm run lint && npm run arch:check`.
Commit: `feat: run signed document worker in node`

---

### Task 4: Real integration proof and persistent Docker deployment

**Files:**
- Create: `tests/integration/document-worker-runtime.test.ts`
- Create: `ops/document-worker/Dockerfile`
- Create: `ops/document-worker/run-demo-worker.sh`
- Modify: `docs/operations/SECRETS.md`
- Modify: `/home/ubuntu/solange-client-demo/preflight.sh` (runtime only; not committed to application repo)

**Interfaces:**
- Integration test consumes a disposable/local Supabase stack and synthetic encrypted signed submission, then runs one worker drain and verifies DB + private Storage result.
- Docker image starts only `npm run worker:documents` and has restart policy configured by deployment command, not inside the image.

- [ ] **Step 1: Write integration test and verify RED**

Create a synthetic sensitive form submission through the same AES-GCM helper, create/sign evidence/job, enqueue only `{ jobId }`, run one worker drain, then assert: job `completed`; evidence `ready`; private path/hash/byte length populated; downloaded object starts with `%PDF`; second drain/upload is idempotent; database/queue/log snapshots do not contain `SIGNED_DOC_SENSITIVE_SENTINEL`.

- [ ] **Step 2: Add Docker runtime packaging**

Dockerfile uses `node:24-bookworm-slim`, `npm ci`, copies application sources and starts `npm run worker:documents`. `run-demo-worker.sh` validates env file mode, builds image, replaces only `solange-document-worker`, and starts with `--restart unless-stopped --network host --env-file ...`.

- [ ] **Step 3: Deploy against isolated demo Supabase**

Use `/home/ubuntu/solange-client-demo/demo.env`; never print it. Build/start the worker container, run the synthetic integration scenario, inspect job/evidence/storage state, then run it again to prove no duplicate artifact.

- [ ] **Step 4: Extend presentation preflight**

Require `solange-document-worker` running with restart policy `unless-stopped`; require recent poll/health marker; retain the existing public browser smoke. Worker failure must fail preflight but must not stop/restart the web container.

- [ ] **Step 5: Full verification**

Run: `npm run lint && npm run typecheck && npm run arch:check && npm run modules:check && npm run migrations:check && npm run test:run && npm run supabase:test && npm run test:e2e && npm run build && git diff --check`.
Expected: every command exits 0. Also run `/home/ubuntu/solange-client-demo/preflight.sh` and expect `PREFLIGHT=PASS`.

- [ ] **Step 6: Commit and refresh recovery artifact**

Commit: `feat: deploy signed document worker runtime`.
Regenerate the recovery patch series from the branch base through the new HEAD, upload a new GitHub Actions recovery artifact, and verify its manifest includes every client-readiness commit plus all worker commits.
