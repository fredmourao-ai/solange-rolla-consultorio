# Reports

## Responsabilidade
Expor read models administrativos, financeiros e fiscais para consulta e exportação.

## Public API
Snapshot de fluxo de caixa e projeção identificada como não contábil.

## Owns
Read models e consultas de relatório, sem alterar dados transacionais.

## Consumes
Contratos públicos de módulos financeiros, administrativos e fiscais.

## Invariantes
Totais monetários são centavos inteiros; realizado e projetado são derivados e não alteram transações.

## Dados sensíveis
Não acessa nem indexa Clinical, conteúdo clínico, envelopes cifrados ou anexos clínicos.

## Proibições
Não importa infraestrutura de outros módulos, não calcula regras transacionais na UI e não substitui a contabilidade oficial.
