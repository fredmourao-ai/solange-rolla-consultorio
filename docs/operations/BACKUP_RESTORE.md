# Backup e Restore

## Objetivos

- RPO alvo: 24 horas.
- RTO alvo: 4 horas; o drill de homologação mede o tempo real.
- Retenção inicial de homologação: 14 dias.
- Exercício: trimestral, antes do go-live e após incidente de disponibilidade/perda.

## Homologação

O runtime publicado de staging usa um projeto Supabase gerenciado. O banco Docker local da VM é apenas infraestrutura local/self-hosted e **não é** fonte de recuperação do staging publicado. `scripts/backup-homologation.sh` continua disponível para ambientes locais que realmente usem esse banco, mas seus artefatos não podem ser apresentados como backup do runtime remoto.

Antes de qualquer migration/promoção de staging, `scripts/check-managed-staging-backup.mjs` consulta a Management API usando `SUPABASE_ACCESS_TOKEN` e exige que `SUPABASE_PROJECT_REF == SUPABASE_STAGING_PROJECT_REF`. A promoção falha fechado se não houver backup gerenciado `COMPLETED` recente dentro do RPO configurado.

O workflow `Staging Backup Audit` executa a mesma checagem de proveniência em contexto protegido de `staging`. Nenhum token, URL com senha ou conteúdo clínico é impresso.

## Restore isolado

Para banco local/self-hosted, o drill portátil existente continua válido com `scripts/verify-backup-restore-docker.sh`.

Para staging gerenciado, **não considerar o restore certificado apenas porque existe backup gerenciado**. O restore deve ser exercitado a partir da fonte gerenciada correta por clone/restore autorizado ou por dump lógico do mesmo project ref com credencial de banco protegida. Até esse drill ocorrer, o estado é `BACKUP PRESENT / RESTORE NOT CERTIFIED`, nunca PASS.

## Evidência histórica e verificação atual

A automação foi ativada na VM de homologação em container `solange-backup-scheduler` com política `unless-stopped`. O drill histórico de 04/09/2026 concluiu com as quatro verificações verdadeiras e RTO de aproximadamente 2 segundos para o conjunto então existente.

Na auditoria independente de 15/09/2026, o último backup observado em `/home/ubuntu/solange-client-demo/backups/` teve os dois SHA-256 validados e o restore isolado do subconjunto `public + clinical + auth` concluiu com `restore_success rto_seconds=7`.

## Storage e chaves externas

O dump PostgreSQL não substitui backup de objetos privados nem das chaves externas. Antes de produção, validar backup/retention do Storage privado no provedor e manter versões das chaves de criptografia fora do banco/backup. Logs e evidências não devem conter PII, tokens, CPF, respostas clínicas ou conteúdo clínico.
