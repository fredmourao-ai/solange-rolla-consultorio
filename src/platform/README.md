# Platform

Infraestrutura compartilhada e adaptadores técnicos do sistema.

## Regras

- Módulos de domínio não importam SDKs de infraestrutura diretamente.
- Integrações externas entram por portas/adaptadores explícitos.
- Secrets são server-only e nunca pertencem a componentes client.
- Filas, storage, observabilidade e Supabase vivem sob `src/platform`.
