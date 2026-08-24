# ADR-0002 — PostgreSQL como fonte de verdade + filas duráveis

Status: Accepted

## Contexto

Agenda, pagamentos, assinatura, fiscal e comunicação precisam de consistência, histórico e reprocessamento seguro. Integrações externas podem ficar indisponíveis ou repetir eventos.

## Decisão

PostgreSQL/Supabase é a fonte única de verdade. Tarefas assíncronas usam Supabase Queues/PGMQ e agendamentos usam Supabase Cron.

Nenhum provider externo é fonte de verdade do estado interno.

## Regras

- mutação de negócio e enqueue devem compartilhar transação Postgres quando possível;
- consumidores são idempotentes;
- webhooks entram por inbox deduplicada;
- retries têm backoff e limite;
- falha terminal aparece no dashboard operacional;
- cron enfileira trabalho, não executa integração pesada diretamente.

## Consequências

Não será necessário Kafka, RabbitMQ ou Redis no MVP. Se volume ou requisitos mudarem, a interface de queue permite substituição futura.
