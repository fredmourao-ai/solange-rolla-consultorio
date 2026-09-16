# Backup e Restore

## Objetivos

- RPO alvo: 24 horas.
- RTO alvo: 4 horas; o drill de homologação mede o tempo real.
- Retenção inicial de homologação: 14 dias.
- Exercício: trimestral, antes do go-live e após incidente de disponibilidade/perda.

## Homologação

A VM mantém backup lógico diário em `/home/ubuntu/solange-client-demo/backups/`. `scripts/backup-homologation.sh` usa esse diretório como destino padrão (ou `SOLANGE_BACKUP_DEST` quando explicitamente configurado), falha fechado quando o destino não está disponível, gera primeiro arquivos `.partial`, só promove dumps não vazios, grava SHA-256 e `LAST_SUCCESS`, usa permissões restritivas e remove artefatos com mais de 14 dias.

São gerados dois artefatos na mesma execução: um dump completo do PostgreSQL/Supabase e um dump `public + clinical + auth` destinado ao drill portátil. O segundo existe porque a imagem local Supabase inclui extensões/plataforma específicas que não devem ser sobrepostas em um PostgreSQL vazio durante o teste de recuperabilidade da aplicação.

O scheduler de homologação roda em container Docker com `--restart unless-stopped`, executa imediatamente após iniciar/reiniciar e repete a cada 86400 segundos. O container possui health check que rejeita `LAST_SUCCESS` stale, artefatos ausentes e divergência de SHA-256 nos dois dumps. O segredo do banco não é persistido no script nem em logs: é lido em runtime do container Supabase já provisionado.

## Restore isolado

Use apenas o artefato `solange-homologacao-app-auth-*.dump` produzido pela automação:

```sh
BACKUP_FILE=/home/ubuntu/solange-client-demo/backups/solange-homologacao-app-auth-YYYYMMDDTHHMMSSZ.dump scripts/verify-backup-restore-docker.sh
```

O verificador cria um PostgreSQL 15 descartável, restaura o dump sem owner/ACL, exige `public.profiles`, `clinical.records`, `auth.users` e políticas RLS, mede RTO e destrói o container ao sair. Nunca restaura sobre produção ou sobre o banco de homologação ativo.

## Evidência histórica e verificação atual

A automação foi ativada na VM de homologação em container `solange-backup-scheduler` com política `unless-stopped`. O drill histórico de 04/09/2026 concluiu com as quatro verificações verdadeiras e RTO de aproximadamente 2 segundos para o conjunto então existente.

Na auditoria independente de 15/09/2026, o último backup observado em `/home/ubuntu/solange-client-demo/backups/` teve os dois SHA-256 validados e o restore isolado do subconjunto `public + clinical + auth` concluiu com `restore_success rto_seconds=7`.

## Storage e chaves externas

O dump PostgreSQL não substitui backup de objetos privados nem das chaves externas. Antes de produção, validar backup/retention do Storage privado no provedor e manter versões das chaves de criptografia fora do banco/backup. Logs e evidências não devem conter PII, tokens, CPF, respostas clínicas ou conteúdo clínico.
