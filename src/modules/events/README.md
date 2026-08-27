# Events

## Responsabilidade
Controlar eventos, inscrições, lista de espera e presença.

## Public API
Criação de eventos, inscrição por Pessoa e presença.

## Owns
Eventos, inscrições, histórico de status, presença e despesas diretas de eventos.

## Consumes
IDs do cadastro público de Pessoas e contratos públicos financeiros.

## Invariantes
Pessoa não pode ter inscrição duplicada ativa; capacidade, preço em centavos e presença são estados separados.

## Dados sensíveis
Não acessa conteúdo clínico.

## Proibições
Não cria cadastro paralelo, não mistura presença com pagamento e não acessa infraestrutura de outro módulo.
