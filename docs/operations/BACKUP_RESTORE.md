# Backup e Restore

## Objetivos do MVP

- RPO alvo: 24 horas, usando backup gerenciado diário e retenção definida pelo
  projeto Supabase de produção.
- RTO alvo: 4 horas para restaurar a operação mínima em um projeto isolado.
- Responsável primário: proprietário técnico do consultório; substituto: pessoa
  administradora designada no checklist de produção.
- Exercício: trimestral e após qualquer incidente de disponibilidade ou perda.

Esses são objetivos operacionais, não garantia contratual do provedor. O tempo
real medido em cada exercício deve substituir os valores estimados no registro
de evidência.

## Procedimento

1. Abrir incidente e registrar horário, backup escolhido, versão de migration e
   responsável.
2. Provisionar um projeto Supabase de staging/restore separado de produção.
3. Restaurar o dump nesse projeto usando `scripts/verify-backup-restore.sh` com
   `RESTORE_ENV=staging_restore_drill`.
4. Validar migrations, constraints, RLS, login sintético, buckets privados e
   contagens esperadas do seed. Nunca usar `db reset` ou restore sobre produção.
5. Fornecer temporariamente as versões correspondentes das chaves L3 fora do
   banco e confirmar que envelopes só decriptam quando a versão está presente.
   O banco sozinho não deve revelar plaintext.
6. Registrar RTO medido, falhas e ações corretivas; remover o projeto isolado
   conforme a política de retenção do provedor.

O dump, logs e screenshots do exercício não podem conter pessoas reais,
tokens, CPF, respostas de formulário ou conteúdo clínico.
