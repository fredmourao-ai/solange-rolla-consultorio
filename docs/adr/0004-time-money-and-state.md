# ADR-0004 — Tempo, dinheiro e máquinas de estado

Status: Accepted

## Contexto

Cobrança por cancelamento depende de cálculo temporal específico; financeiro precisa ser determinístico; agenda, financeiro e fiscal não podem colapsar em um único status.

## Decisão

### Tempo
- persistência em `timestamptz`/UTC;
- regra de negócio na timezone `America/Sao_Paulo`;
- política inicial: 48 horas computáveis, sábado/domingo excluídos;
- persistir `policy_version` e deadline no agendamento.

### Dinheiro
- valores monetários em centavos inteiros (`bigint`);
- percentuais/impostos em `numeric` de escala explícita;
- nunca usar float para cálculo financeiro.

### Estado
Máquinas de estado separadas para appointment, receivable/payment, event registration, form/signature e fiscal.

Transições inválidas são rejeitadas no domínio e testadas.

## Consequências

Mudança futura de política não altera históricos. Pagamento não implica automaticamente consulta realizada; NFS-e não implica automaticamente pagamento recebido.
