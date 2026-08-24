# ADR-0006 — Criptografia de campo para conteúdo clínico

Status: Accepted

## Contexto

RLS/MFA restringem acesso lógico, mas backups, acesso administrativo indevido ou extração acidental do banco podem expor texto clínico em claro. O sistema não necessita busca full-text global sobre conteúdo clínico.

## Decisão

Criptografar no servidor o **conteúdo textual clínico L3** antes de persistir no banco.

Formato mínimo por registro:

- `ciphertext`
- `nonce/iv`
- `auth_tag` quando separado pelo algoritmo
- `key_version`

Usar algoritmo autenticado moderno (ex.: AES-256-GCM ou equivalente de biblioteca madura). Nenhuma implementação criptográfica própria.

## Gestão de chaves

- chave mestra nunca fica no banco;
- armazenar em secret manager do ambiente;
- staging e production usam chaves diferentes;
- `key_version` permite rotação;
- decrypt ocorre somente no módulo `clinical`, no servidor, após autorização + AAL2;
- chave nunca vai ao browser, log, queue payload ou audit metadata.

## Metadados em claro

Somente IDs/timestamps/status necessários para associação e autorização. O texto clínico fica cifrado.

## Anexos

Continuam em bucket privado com RLS. Criptografia adicional de arquivo pode ser adicionada se threat model/requisito de retenção justificar, sem alterar o contrato do módulo.

## Consequências

- banco/dump isolado não revela texto clínico;
- busca clínica precisa ocorrer após decrypt controlado ou por metadados permitidos;
- rotação de chave requer job específico e auditado;
- testes devem garantir que plaintext não aparece no banco/log.
