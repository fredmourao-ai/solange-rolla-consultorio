# Signatures

## Responsabilidade

Congelar submissões, calcular hash canônico e registrar evidências de assinatura.

## Owns

O módulo possui evidência, hash, declaração e jobs de documento assinado.

## Consumes

Consome a versão da submissão por ID, documentos versionados e a fila de
documentos através de contratos públicos.

## Public API

O contrato público está em public.ts e expõe apenas canonicalização e hash
determinísticos.

## Invariantes

- A mesma estrutura produz o mesmo SHA-256 independentemente da ordem de chaves.
- Arrays preservam a ordem declarada.
- Evidência assinada é imutável; correção cria nova versão.
- Hash não inclui campos voláteis.

## Dados sensíveis

Respostas clínicas são processadas somente em memória no servidor e não são
duplicadas na evidência, no log ou no job.

## Proibições

- Não armazenar respostas em claro na evidência.
- Não gerar PDF em diretório público.
- Não permitir UPDATE/DELETE de evidência assinada.
