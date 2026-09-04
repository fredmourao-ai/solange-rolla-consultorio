# Homologação — índice operacional

Este diretório é a fonte de verdade para a homologação funcional do sistema antes do go-live com a cliente.

## Documentos

1. [`AUDITORIA_PRE_HOMOLOGACAO_2026-09-04.md`](AUDITORIA_PRE_HOMOLOGACAO_2026-09-04.md) — estado real do código, ambiente, CI, integrações, segurança, rotinas e backup/restore.
2. [`MANUAL_TESTES_HOMOLOGACAO.md`](MANUAL_TESTES_HOMOLOGACAO.md) — roteiro completo das rotinas a testar, inclusive cenários negativos, falhas, segurança e operação.
3. [`MATRIZ_EVIDENCIAS_HOMOLOGACAO.md`](MATRIZ_EVIDENCIAS_HOMOLOGACAO.md) — checklist rastreável de PASS/FAIL/BLOCKED e evidências.
4. [`BACKUP_RESTORE_HOMOLOGACAO.md`](BACKUP_RESTORE_HOMOLOGACAO.md) — estado atual, rotina obrigatória e teste de restauração.

## Regra de status

- **PASS**: rotina executada no ambiente de homologação e resultado esperado comprovado.
- **FAIL**: rotina executada e resultado divergente; abrir issue/PR, corrigir e repetir.
- **BLOCKED**: não existe atualmente caminho real para executar a rotina ou há dependência externa que impede o cenário específico.
- **N/A**: cenário explicitamente fora da homologação corrente.
- **NOT RUN**: ainda não executado.

Um teste não vira PASS porque existe unit test, migration ou módulo correspondente. Para rotinas de usuário, é necessário haver caminho real pela aplicação ou uma operação administrativa explicitamente documentada.

## Ambiente autorizado para esta rodada

- Infraestrutura: VM de homologação já utilizada pelo projeto.
- Usuário inicial: administrador definido para a homologação.
- Dados: preferência por dados sintéticos. Quando for necessário validar entrega real de mensagem, podem ser utilizados exclusivamente dados pessoais do próprio patrocinador/testador que autorizou o uso, nunca dados de terceiros/pacientes reais da cliente.
- WhatsApp/e-mail: credenciais temporárias de teste, segregadas e removidas/rotacionadas antes de produção.
- NFS-e: somente mock/sandbox até aprovação fiscal/contábil.
- Integrações live de produção: permanecem desativadas.

## Critério para iniciar

A homologação é dividida em fases. Smoke tests e fluxos já alcançáveis podem começar mesmo existindo pendências externas de produção. Entretanto, uma rotina marcada como tecnicamente não alcançável não pode ser aprovada por inferência: deve ser corrigida, implantada e testada de verdade antes da homologação final.

## Critério para encerrar a homologação

A homologação funcional só pode ser declarada concluída quando:

- todos os casos obrigatórios da matriz estiverem PASS ou formalmente N/A;
- nenhum P0/P1 técnico aplicável estiver aberto;
- CI, banco, segurança e E2E relevantes estiverem verdes no SHA homologado;
- backup tiver sido gerado e restauração isolada comprovada;
- dados de teste e credenciais temporárias tiverem plano de limpeza/rotação;
- o SHA/versão aprovado estiver registrado no termo de encerramento da homologação.

Isso não substitui os gates externos de produção descritos em `docs/operations/GO_LIVE_CHECKLIST.md`.