# Sensitive Data Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a infraestrutura transversal de criptografia, auditoria e storage privado necessária antes de persistir formulário clínico ou registro psicológico.

**Architecture:** Dados L3 são cifrados no servidor com AES-256-GCM por uma porta de criptografia versionada. Chaves ficam fora do banco/repositório; ciphertext carrega `keyVersion`, `iv` e `authTag`. Auditoria registra acesso/ação, nunca conteúdo bruto.

**Tech Stack:** Node.js `crypto`, TypeScript, Supabase/PostgreSQL, Supabase Storage privado, Vitest, pgTAP.

**Spec:** `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- Chave L3 nunca entra no browser, banco, log ou Git.
- AES-256-GCM com IV aleatório novo por cifragem.
- AAD vincula ciphertext ao tipo/id da entidade para impedir troca silenciosa entre registros.
- Novas gravações usam a versão de chave ativa; leitura suporta versões anteriores.
- Decriptação ocorre somente em server code após autorização apropriada.

---

### Task 1: Keyring e envelope de criptografia

**Files:**
- Create: `src/platform/crypto/types.ts`
- Create: `src/platform/crypto/keyring.ts`
- Create: `src/platform/crypto/aes-gcm.ts`
- Test: `src/platform/crypto/aes-gcm.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces `SensitiveDataCrypto.encrypt(plaintext, context): EncryptedEnvelope`.
- Produces `SensitiveDataCrypto.decrypt(envelope, context): string`.
- `EncryptedEnvelope = { alg: 'A256GCM'; keyVersion: number; iv: string; ciphertext: string; authTag: string }`.

- [ ] **Step 1: Testar round-trip e não determinismo**

```ts
it('encrypts with a fresh IV and decrypts with matching AAD', async () => {
  const a = await crypto.encrypt('segredo', { entity: 'form', id: 'id-1' })
  const b = await crypto.encrypt('segredo', { entity: 'form', id: 'id-1' })
  expect(a.ciphertext).not.toBe(b.ciphertext)
  await expect(crypto.decrypt(a, { entity: 'form', id: 'id-1' })).resolves.toBe('segredo')
})
```

- [ ] **Step 2: Testar AAD incorreto**

Tentar decriptar envelope de `id-1` como `id-2` deve falhar autenticação.

- [ ] **Step 3: Implementar keyring**

Ler `CLINICAL_ENCRYPTION_KEY_V1` base64 de exatamente 32 bytes e `CLINICAL_ENCRYPTION_ACTIVE_VERSION=1`. Não aceitar chave fraca/curta.

- [ ] **Step 4: Implementar AES-GCM**

Usar IV de 12 bytes aleatórios, auth tag de 16 bytes e AAD canônico `entity:id`.

- [ ] **Step 5: Commit**

```bash
git add src/platform/crypto .env.example
 git commit -m "feat: add versioned sensitive data encryption"
```

---

### Task 2: Auditoria append-only

**Files:**
- Create: `supabase/migrations/20260824002500_audit.sql`
- Create: `supabase/tests/025_audit.sql`
- Create: `src/modules/audit/domain/audit-event.ts`
- Create: `src/modules/audit/application/record-audit-event.ts`
- Create: `src/modules/audit/public.ts`
- Create: `src/modules/audit/README.md`
- Test: `src/modules/audit/domain/audit-event.test.ts`

**Interfaces:**
- Produces `recordAuditEvent({ actor, action, entityType, entityId, correlationId, metadata })`.
- Metadata aceita apenas estrutura sanitizada; nenhum campo `content`, `answers`, `notes`, `token`, `secret`.

- [ ] **Step 1: Testar redaction guard**

```ts
expect(() => buildAuditMetadata({ notes: 'texto clínico' })).toThrow('SENSITIVE_AUDIT_METADATA')
```

- [ ] **Step 2: Migration**

Criar `audit_events` append-only. Policies bloqueiam UPDATE/DELETE; leitura restrita ao owner e, quando aplicável, subconjuntos administrativos.

- [ ] **Step 3: Testar imutabilidade no banco**

INSERT autorizado; UPDATE e DELETE devem falhar para roles da aplicação.

- [ ] **Step 4: Commit**

```bash
git add supabase src/modules/audit
 git commit -m "feat: add immutable audit trail"
```

---

### Task 3: Buckets privados e acesso assinado

**Files:**
- Create: `supabase/migrations/20260824002600_private_storage.sql`
- Create: `supabase/tests/026_storage.sql`
- Create: `src/platform/storage/private-storage.ts`
- Test: `src/platform/storage/private-storage.test.ts`

**Interfaces:**
- Produces buckets `signed-documents-private`, `fiscal-documents-private`, `financial-receipts-private`, `clinical-private`.
- Produces `PrivateStorage.put()` e `createShortLivedDownloadUrl()` server-side.

- [ ] **Step 1: Criar policies default-deny**

Nenhum bucket é público. `clinical-private` exige owner AAL2 para leitura; secretary/accounting devem falhar.

- [ ] **Step 2: Testar URL curta**

Signed URL usa TTL configurado <= 10 minutos para documentos sensíveis e nunca é persistida no banco.

- [ ] **Step 3: Testar paths opacos**

Path não contém CPF, nome do paciente ou diagnóstico; usar UUIDs/correlation IDs.

- [ ] **Step 4: Gate completo**

Run: `npm run lint && npm run typecheck && npm run test:run && npm run supabase:test && npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add supabase src/platform/storage
 git commit -m "feat: add private storage controls"
```
