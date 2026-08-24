# ADR-0005 — Runtime inicial de workers assíncronos

Status: Accepted

## Contexto

Supabase Queues é pull-based. Confirmações, aniversários, mensagens, documentos e NFS-e precisam ser processados fora da requisição web sem manter servidor próprio no MVP.

## Decisão

Usar **Supabase Edge Functions** como runtime inicial dos consumidores de fila.

Supabase Cron invoca funções dispatcher em intervalos curtos. O dispatcher lê lote limitado da fila, processa itens com idempotência e arquiva/remove mensagens concluídas.

Filas iniciais:

- `messaging`
- `fiscal`
- `documents`
- `automations`

## Regras

- lógica de domínio permanece nos módulos/contratos compartilhados; Edge Function é adaptador/runtime;
- processamento precisa respeitar limite de runtime e tamanho de lote;
- operação longa deve ser quebrada ou migrada para worker persistente;
- interface de Queue/Worker não depende de Edge Functions, permitindo trocar runtime sem alterar módulos.

## Gatilho de revisão

Migrar consumidor específico para worker persistente se duração, volume, biblioteca nativa ou requisito de conexão contínua tornarem Edge Functions inadequadas.
