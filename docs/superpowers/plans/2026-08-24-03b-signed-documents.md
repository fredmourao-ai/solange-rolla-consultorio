# Signed Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar o PDF comprovante de formulário/termo assinado de forma assíncrona, idempotente e privada, sem fazer a validade da assinatura depender do renderer.

**Architecture:** `signatures` registra `document_jobs` na mesma transação da assinatura. Um dispatcher publica jobs na queue `documents`; o document worker decripta conteúdo sensível apenas em memória, renderiza o PDF, armazena no bucket privado e atualiza status/hash.

**Tech Stack:** PostgreSQL outbox, Supabase Queue `documents`, Edge Function/worker, server-side PDF renderer, SensitiveDataCrypto, private Storage, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- A assinatura fica `signed` mesmo se PDF estiver `pending/failed_retryable`.
- `document_jobs.idempotency_key` é unique.
- Plaintext L3 não é gravado em arquivo temporário, log ou queue payload.
- Queue payload contém IDs/referências, nunca respostas do formulário.
- PDF final fica em `signed-documents-private`.

---

### Task 1: Outbox de documento e dispatcher

**Files:**
- Modify: `supabase/migrations/20260824006000_signatures.sql` antes de aplicada; se já aplicada, Create: `supabase/migrations/20260824006100_document_jobs.sql`
- Create: `src/modules/signatures/application/dispatch-document-jobs.ts`
- Test: `src/modules/signatures/application/dispatch-document-jobs.test.ts`

**Interfaces:**
- Produces `document_jobs(id, signature_evidence_id, kind, idempotency_key, status, dispatched_at, attempts, last_error_code, created_at, completed_at)`.
- Consumes `QueuePort` queue `documents`.

- [ ] **Step 1: Testar criação transacional**

Assinar a mesma submission/version duas vezes com a mesma idempotency key deve resultar em uma evidência e um único `document_jobs`.

- [ ] **Step 2: Dispatcher**

Claim de jobs `pending` usa lock seguro; publica `{ kind: 'signed-form.pdf', idempotencyKey, payload: { jobId } }`; marca `dispatched_at` somente após send bem-sucedido.

- [ ] **Step 3: Testar crash/reexecução**

Se dispatcher cair depois de send e antes de marcar, segunda execução pode reenviar o job, mas worker deve deduplicar por `idempotencyKey`/job status e produzir um único artefato lógico.

- [ ] **Step 4: Commit**

```bash
git add supabase src/modules/signatures
git commit -m "feat: add signed document outbox"
```

---

### Task 2: Renderer e worker idempotente

**Files:**
- Create: `src/modules/signatures/application/render-signed-document.ts`
- Create: `src/modules/signatures/infrastructure/pdf-renderer.ts`
- Create: `supabase/functions/document-worker/index.ts`
- Test: `src/modules/signatures/application/render-signed-document.test.ts`
- Test: `tests/integration/document-worker.test.ts`

**Interfaces:**
- Produces `renderSignedDocument(jobId): Promise<DocumentArtifact>`.
- `DocumentArtifact = { storagePath, sha256, byteLength, mediaType: 'application/pdf' }`.

- [ ] **Step 1: Testar renderer com dados sintéticos**

Documento deve incluir versão do formulário/declaração, respostas, nome digitado/assinatura quando aplicável, timestamp e código de verificação, sem incluir IP/user-agent em destaque desnecessário.

- [ ] **Step 2: Decriptar somente em memória**

Worker carrega submission sensível autorizadamente em contexto de sistema, decripta para objeto em memória, renderiza buffer e descarta referências após upload. Não usar `/tmp` para plaintext.

- [ ] **Step 3: Upload privado e hash**

Path `signed/<signature-evidence-uuid>/document.pdf`; calcular SHA-256 do buffer, subir para storage privado e persistir path/hash/size em `signature_evidence`.

- [ ] **Step 4: Retry classification**

Storage/network temporário => retryable; conteúdo corrompido/hash/canonicalization mismatch => failed_final + alerta operacional. Worker só arquiva queue job após estado persistido.

- [ ] **Step 5: Testar idempotência**

Processar mesmo job duas vezes deve retornar o mesmo artifact lógico e não criar múltiplos paths/records.

- [ ] **Step 6: Testar vazamento**

Usar sentinela `SIGNED_DOC_SENSITIVE_SENTINEL`, capturar logs e queue payload; sentinela pode existir apenas no buffer PDF em memória/test result controlado, nunca em logs/payload persistido.

- [ ] **Step 7: Commit**

```bash
git add src/modules/signatures supabase/functions/document-worker tests/integration
git commit -m "feat: render signed documents asynchronously"
```

---

### Task 3: Consulta/entrega do documento

**Files:**
- Create: `src/modules/signatures/application/get-signed-document.ts`
- Create: `src/modules/signatures/ui/document-status.tsx`
- Test: `src/modules/signatures/application/get-signed-document.test.ts`

**Interfaces:**
- Produces status `pending|processing|ready|failed_retryable|failed_final` e short-lived URL quando autorizado.

- [ ] **Step 1: Staff access**

Owner autorizado obtém URL privada curta; secretary só acessa o documento se política administrativa explicitamente permitir e o conteúdo não exceder seu escopo. Por padrão, pré-consulta sensível não é aberto à secretaria.

- [ ] **Step 2: Patient access**

Se produto liberar cópia ao paciente, usar capability purpose específica vinculada ao documento; capability não lista outros arquivos e expira.

- [ ] **Step 3: Gate completo**

Run: `npm run lint && npm run typecheck && npm run test:run && npm run supabase:test && npm run test:e2e && npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/modules/signatures
git commit -m "feat: add signed document access controls"
```
