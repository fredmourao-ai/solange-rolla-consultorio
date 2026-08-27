# Fiscal

## Responsabilidade
Controlar o ciclo de vida fiscal de servicos e eventos, incluindo perfil fiscal versionado, tratamento por origem e contrato de NFS-e.

## Public API
Tipos e funcoes exportados por `public.ts`: validacao de perfil, avaliacao de tratamento, transicoes de documento e `NfseProvider`.

## Owns
Perfis fiscais, tratamentos fiscais versionados, documentos fiscais, tentativas de provider e referencias privadas de artefatos fiscais.

## Consumes
IDs e snapshots minimos dos contratos publicos de Pessoas, Agenda, Eventos e Contas a Receber. O modulo nao importa infraestrutura desses modulos.

## Invariantes
Valores sao centavos inteiros; status fiscal e independente de agenda e financeiro; documentos emitidos nao sao sobrescritos; cada documento preserva a versao de perfil e tratamento usada; `appointment_no_show` e cancelamento tardio exigem tratamento fiscal explicito.

## Dados sensíveis
CPF/CNPJ e artefatos XML/PDF sao tratados somente server-side e armazenados em bucket privado. Credenciais, documentos integrais e conteudo clinico nunca entram em logs.

## Proibições
Nao emitir em producao sem gate fiscal e `NFSE_LIVE_ENABLED`; nao assumir tratamento de falta igual ao de consulta realizada; nao chamar provider dentro de transacao financeira; nao expor documentos por link publico permanente; nao acessar conteudo clinico.

## Operacao
Elegibilidade retorna blockers sanitizados e separa `ready`, `review` e `not_ready`. Requests usam a chave composta por origem, perfil e tratamento para preservar snapshots e idempotencia. O provider mock e exclusivo de desenvolvimento, testes e homologacao controlada; nenhum identificador sintetico representa uma NFS-e real.
