# Fiscal

## Responsabilidade
Controlar o ciclo de vida fiscal de servicos e eventos, incluindo perfil fiscal versionado, tratamento por origem e contrato de NFS-e.

## Public API
Tipos e funcoes exportados por `public.ts`: validacao de perfil, avaliacao de tratamento, transicoes de documento e `NfseProvider`.

## Owns
Perfis fiscais, tratamentos fiscais versionados, documentos fiscais, tentativas de provider, referencias privadas de artefatos fiscais e eventos de cancelamento.

## Consumes
IDs e snapshots minimos dos contratos publicos de Pessoas, Agenda, Eventos e Contas a Receber. O modulo nao importa infraestrutura desses modulos.

## Invariantes
Valores sao centavos inteiros; status fiscal e independente de agenda e financeiro; documentos emitidos nao sao sobrescritos; cada documento preserva a versao de perfil e tratamento usada; `appointment_no_show` e cancelamento tardio exigem tratamento fiscal explicito.

## Dados sensíveis
CPF/CNPJ e artefatos XML/PDF sao tratados somente server-side e armazenados em bucket privado. Credenciais, documentos integrais e conteudo clinico nunca entram em logs.

## Proibições
Nao emitir em producao sem gate fiscal e `NFSE_LIVE_ENABLED`; nao assumir tratamento de falta igual ao de consulta realizada; nao chamar provider dentro de transacao financeira; nao expor documentos por link publico permanente; nao persistir tokens de capability; nao acessar conteudo clinico.

## Operacao administrativa
O painel separa itens prontos para revisao, tratamentos pendentes, emissao e erros. PDF/XML sao enviados ao bucket privado com SHA-256 e tamanho registrados. Cancelamentos sao eventos idempotentes que preservam o documento original e podem referenciar substituto. A notificacao usa apenas uma referencia opaca de capability no outbox.

## Operacao
Elegibilidade retorna blockers sanitizados e separa `ready`, `review` e `not_ready`. Requests usam a chave composta por origem, perfil e tratamento para preservar snapshots e idempotencia. O provider mock e exclusivo de desenvolvimento, testes e homologacao controlada; nenhum identificador sintetico representa uma NFS-e real.

## Worker e providers
O worker consome mensagens da fila `fiscal`, arquiva somente jobs processados e reencaminha falhas com atraso. O adapter nacional exige `liveEnabled` antes de qualquer chamada de rede, classifica falhas transitórias e mantém idempotency key no ciclo de emissão/cancelamento. Respostas ambíguas não são reemitidas automaticamente.
