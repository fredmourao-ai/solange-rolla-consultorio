# Appointments

## Responsabilidade

Gerenciar agenda, estados de consulta, confirmação, reagendamento, cancelamento
e snapshot histórico da política de cobrança.

## Owns

O módulo possui consultas, serviços, políticas de cancelamento e histórico de
transições.

## Consumes

Consome IDs públicos de people e contratos de comunicação, sem importar
infraestrutura interna de outros módulos.

## Public API

O contrato público está em public.ts. A UI não calcula deadlines; recebe o
snapshot persistido pelo caso de uso.

## Invariantes

- Estados de agenda são independentes de estados financeiros e fiscais.
- A política e o deadline são persistidos na consulta no momento do
  agendamento.
- 48 horas computáveis excluem sábado e domingo.
- Valores monetários são centavos inteiros.

## Dados sensíveis

O módulo não armazena conteúdo clínico. Dados de pessoa são referenciados por
ID e acessados pelo contrato público correspondente.

## Proibições

- Não recalcular deadlines históricos com política nova.
- Não emitir documento fiscal.
- Não alterar automaticamente o estado financeiro ao mudar o status da agenda.
- Não importar internals de people, forms ou financeiro.
