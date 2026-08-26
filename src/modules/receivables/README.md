# Receivables

## Responsabilidade
Controlar cobranças e recebimentos em centavos inteiros.

## Public API
Recebíveis idempotentes, ajustes auditados e saldos derivados.

## Owns
Receivables, ajustes, pagamentos e reembolsos.

## Consumes
IDs de pessoas, consultas e eventos por contratos públicos.

## Invariantes
Pagamentos não excedem saldo sem crédito explícito; histórico não é sobrescrito.

## Dados sensíveis
Não acessa conteúdo clínico.

## Proibições
Não altera status de agenda automaticamente nem usa ponto flutuante.
