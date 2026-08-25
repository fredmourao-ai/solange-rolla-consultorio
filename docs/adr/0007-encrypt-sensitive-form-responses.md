# ADR-0007 — Criptografar respostas sensíveis de formulários

Status: Accepted  
Date: 2026-08-24

## Contexto

A arquitetura v2 classifica informações de saúde como L3 e determina criptografia antes da persistência. Uma versão inicial do modelo conceitual mencionava respostas de formulário em JSONB, o que seria aceitável apenas para formulários estritamente administrativos e entrava em conflito com a proteção exigida para pré-consulta clínica.

## Decisão

Todo template de formulário possui `data_classification`.

- `administrative`: pode persistir payload estruturado mínimo em JSONB, desde que não contenha dados L3.
- `sensitive`: respostas completas são serializadas/canonicalizadas no servidor e cifradas com a infraestrutura `SensitiveDataCrypto` AES-256-GCM antes de chegar ao banco.

Para submissões sensíveis, o banco persiste somente ciphertext, IV, auth tag e key version. O plaintext existe apenas em memória server-side durante operações autorizadas de preenchimento/revisão/assinatura.

A assinatura calcula o hash canônico sobre o conteúdo decriptado em memória, mas não duplica respostas em claro em `signature_evidence`.

## Consequências

- buscas/reporting sobre respostas L3 não são permitidos no MVP;
- troca/rotação de chave é possível por `key_version`;
- dumps do banco não revelam respostas clínicas sem a chave externa;
- formulários administrativos continuam podendo usar JSONB quando apropriado;
- qualquer referência anterior a “answers JSONB” para pré-consulta sensível deve ser interpretada como superseded por este ADR e `docs/DATA_MODEL.md` v2.
