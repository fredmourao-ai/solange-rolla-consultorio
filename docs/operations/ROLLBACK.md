# Rollback

## Aplicação

1. Identificar o SHA promovido e o último SHA saudável.
2. Pausar jobs externos e desligar providers live afetados.
3. Reverter a versão da aplicação no provedor de deploy, preservando logs e
   audit trail.
4. Confirmar health, login/MFA, agenda, filas e ausência de 5xx anormal.

## Banco

Migrations aplicadas nunca são editadas nem removidas. O código deve ser
compatível com o schema anterior durante a janela de rollback. Mudanças
destrutivas usam expand/contract em releases separadas: adicionar e backfill,
publicar código compatível, e remover apenas em release posterior após backup e
restore drill.

Se o rollback exigir banco, restaurar somente em projeto isolado para análise e
usar migration corretiva forward-only no ambiente alvo após revisão. Não usar
`db reset` em staging ou produção.

## Pós-rollback

Registrar motivo, SHA, migration state, impacto, duração, smoke test e decisão
de reprocessar jobs. Idempotency keys e ledger devem permanecer preservados.
