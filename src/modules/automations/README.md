# Automations

## Responsabilidade
Identificar eventos temporais e enfileirar mensagens e tarefas idempotentes.

## Public API
Agendamento de confirmações de consulta.

## Owns
Regras de automação e jobs de negócio.

## Consumes
Contratos públicos de agenda, pessoas e mensageria.

## Invariantes
Reexecução não cria mensagem lógica duplicada.

## Dados sensíveis
Não acessa conteúdo clínico.

## Proibições
Não envia diretamente para providers externos.
