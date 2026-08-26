# Payables

## Responsabilidade
Controlar despesas avulsas e recorrentes, baixa parcial ou integral e comprovantes privados.

## Public API
Criação idempotente, geração mensal e registro de pagamentos.

## Owns
Fornecedores, categorias de despesa, contas a pagar, pagamentos de despesas e regras de recorrência.

## Consumes
IDs de pessoas e referências de storage por contratos públicos.

## Invariantes
Valores são centavos inteiros; histórico de pagamentos não é sobrescrito; recorrências usam uma chave única por regra e competência.

## Segurança
Dados financeiros são acessíveis ao proprietário e ao papel `accounting`; paths de comprovantes referenciam apenas o bucket privado `financial-receipts-private`.

## Dados sensíveis
Não acessa conteúdo clínico; documentos financeiros ficam em storage privado.

## Proibições
Não usa ponto flutuante, não apaga histórico de pagamentos e não acessa infraestrutura de outro módulo.
