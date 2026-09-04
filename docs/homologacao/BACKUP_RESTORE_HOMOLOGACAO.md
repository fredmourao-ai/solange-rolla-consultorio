# Backup e restore na homologação

## Resposta direta

Na auditoria de 04/09/2026, a rotina estava **parcialmente incluída**:

- existe runbook de backup/restore;
- existe script para validar/restaurar um dump já existente;
- existe gate de go-live exigindo backup recente e restore comprovado;
- existe um volume separado montado no host para receber backups;
- **não existe/estava ativo um job Solange responsável por gerar backups automaticamente**.

Portanto, backup não pode ser marcado como homologado até existir automação real e um restore a partir de um backup produzido por ela.

## Evidência do ambiente auditado

- nenhum timer systemd Solange de backup encontrado;
- nenhum cron Solange/`pg_dump` encontrado;
- nenhum arquivo de backup Solange encontrado no volume dedicado;
- `/mnt/fredwin-backup` estava montado;
- volume observado: aproximadamente 216 GB totais, 204 GB livres;
- disco raiz estava em aproximadamente 83% de uso;
- `scripts/verify-backup-restore.sh` existe, mas recebe `BACKUP_FILE`: ele não cria o backup.

## Requisito para a homologação

A implementação operacional deve atender, no mínimo:

1. gerar backup consistente do PostgreSQL/Supabase do ambiente de homologação;
2. usar arquivo temporário e promoção atômica para não publicar backup incompleto;
3. armazenar checksum;
4. restringir permissões do arquivo/diretório;
5. proteger dados pessoais em repouso conforme a infraestrutura disponível;
6. nunca imprimir senha, URL com credencial, token ou conteúdo clínico em log;
7. gravar em volume diferente do root do sistema;
8. aplicar retenção/rotação definida;
9. falhar quando destino estiver desmontado/sem espaço, em vez de gravar silenciosamente no root;
10. expor status/último sucesso para monitoramento;
11. executar automaticamente, com persistência após reboot;
12. permitir disparo manual para testes;
13. permitir restore somente em ambiente isolado;
14. registrar RPO e RTO reais do exercício.

## Política inicial recomendada para homologação

Até definição definitiva de produção:

- frequência: diária;
- RPO alvo: <= 24h;
- retenção inicial: 14 backups diários de homologação, ajustável após medir tamanho;
- destino primário no host de homologação: `/mnt/fredwin-backup/solange/homologacao/`;
- o job deve recusar execução se `/mnt/fredwin-backup` não for um mount point;
- permissões de diretório: somente conta operacional autorizada/root;
- checksum SHA-256 por backup;
- logs sem PII;
- restore drill antes do aceite final da homologação.

O destino local separado reduz o risco de perda junto com o root, mas **não substitui backup gerenciado/off-host da produção**.

## Conteúdo do backup

O dump deve conter o banco necessário para reconstruir o sistema, incluindo schemas e dados usados pela aplicação. Segredos/chaves de criptografia permanecem fora do dump e possuem backup/rotação próprios no gerenciador de segredos.

O storage privado de documentos precisa de estratégia complementar quando os objetos não estiverem garantidos pelo mecanismo gerenciado do provedor. Banco restaurado sem objetos privados não é restauração completa do serviço.

## Dados pessoais durante homologação

O patrocinador autorizou o uso dos próprios dados para validar fluxos reais. Isso não transforma os dados em descartáveis.

Qualquer backup que contenha esses registros deve:

- receber o mesmo controle de acesso do banco;
- não ser copiado para evidências ou tickets;
- entrar no inventário da rodada de homologação;
- ser removido/expirado segundo a política de limpeza após a homologação, respeitando a necessidade de evidência técnica mínima;
- nunca conter dados reais de terceiros/pacientes da cliente.

## Teste obrigatório — criação

### BKP-01

1. Confirmar que o destino é mount point.
2. Disparar o job manualmente.
3. Confirmar exit code zero.
4. Confirmar criação de arquivo não vazio.
5. Confirmar checksum correspondente.
6. Confirmar permissões restritivas.
7. Registrar tamanho, início, fim e SHA do app.

**PASS:** backup íntegro produzido no destino correto, sem segredo/PII no log.

## Teste obrigatório — falha segura

### BKP-02

Simular destino indisponível ou apontar o teste para um caminho não montado.

**PASS:** job falha explicitamente e não grava fallback no root.

## Teste obrigatório — retenção

### BKP-03

Criar conjunto controlado de arquivos antigos e executar rotação.

**PASS:** apenas arquivos elegíveis são removidos; backup atual permanece; ação é registrada sem conteúdo sensível.

## Teste obrigatório — restore isolado

### BKP-04

1. Provisionar banco isolado de restore.
2. Selecionar backup produzido pelo job homologado.
3. Verificar checksum.
4. Executar `scripts/verify-backup-restore.sh` com `RESTORE_ENV=staging_restore_drill` e URL exclusiva do ambiente isolado.
5. Validar migrations, constraints, RLS e tabelas críticas.
6. Fazer login sintético no app apontado ao restore quando aplicável.
7. Validar acesso autorizado e negações de segurança.
8. Validar contagens/IDs sintéticos esperados.
9. Remover o ambiente isolado ao final.

**PASS:** restauração concluída sem tocar o ambiente de homologação/produção e com RTO registrado.

## Teste obrigatório — criptografia clínica

### BKP-05

No ambiente restaurado, confirmar que registros clínicos persistidos estão cifrados e que o dump não contém plaintext clínico.

**PASS:** conteúdo sensível não é recuperável apenas com o banco; chave/versionamento externo é necessário conforme arquitetura.

## Evidência mínima

Registrar na matriz:

- timestamp do backup;
- SHA do app;
- caminho lógico/nome do arquivo sem PII;
- tamanho;
- SHA-256;
- resultado do timer/job;
- RPO observado;
- data do restore drill;
- RTO observado;
- resultado de RLS e smoke pós-restore.

## Gate

- **Início dos testes funcionais:** backup automático ausente não impede smoke/fluxos não destrutivos.
- **Uso continuado de dados pessoais de homologação:** recomenda-se implementar backup protegido antes de acumular dados relevantes.
- **Encerramento da homologação:** exige BKP-01 a BKP-05 PASS.
- **Produção:** exige, adicionalmente, mecanismo gerenciado/off-host, retenção aprovada, restore drill e responsáveis definidos em `docs/operations/GO_LIVE_CHECKLIST.md`.