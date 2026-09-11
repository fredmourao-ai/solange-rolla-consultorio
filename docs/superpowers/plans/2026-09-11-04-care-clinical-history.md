# Onda 3 — Atendimento e Prontuário Longitudinal — Plano de Implementação

> **Execução:** alto risco. Usar `superpowers:subagent-driven-development`, TDD, worktree por task e revisão independente obrigatória de autorização/RLS/criptografia.

**Spec:** `docs/superpowers/specs/2026-09-11-solange-end-to-end-operational-design.md`
**Dependências:** Onda 0 permissões, Onda 1 Paciente 360° e Onda 2 Agenda concluídas.

## Objetivo

Permitir que a Profissional inicie o atendimento diretamente de uma consulta, consulte o histórico necessário durante a sessão, registre evolução de forma segura e finalize o atendimento sem digitar IDs internos. A Secretaria acompanha somente o estado operacional e recebe as pendências administrativas posteriores, nunca o conteúdo clínico.

## Barreiras de segurança

Acesso clínico requer simultaneamente:
- usuário autenticado e ativo;
- papel-base clínico elegível;
- permissão clínica específica;
- AAL2/MFA;
- autorização na aplicação/servidor;
- autorização RLS/RPC no banco;
- auditoria de leitura/mutação.

A negação em qualquer camada bloqueia o acesso. Não confiar em componente escondido ou rota obscura.

Plaintext clínico:
- descriptografado apenas server-side após autorização;
- não persistido em logs, analytics, query string, localStorage, IndexedDB, cache persistente ou observabilidade;
- não incluído em payload entregue a Secretaria/Accounting;
- deve usar política explícita `no-store`/equivalente nas respostas que possam carregá-lo.

## Task 1 — Modelo de acompanhamento terapêutico

Separar claramente metadado administrativo do conteúdo clínico.

Se a Onda 1 criou um acompanhamento administrativo, estendê-lo por contrato sem mover conteúdo clínico para `public.people`.

Criar estrutura clínica segura para o conteúdo longitudinal necessário, podendo usar registros cifrados tipados ou entidade cifrada associada ao acompanhamento.

Informações clínicas longitudinais:
- avaliação da demanda;
- objetivos do trabalho;
- evolução e procedimentos técnico-científicos;
- encaminhamento/encerramento;
- anamnese/avaliação inicial quando adotada pela profissional;
- objetivos ativos e mudanças ao longo do processo.

A estrutura deve atender o requisito de prontuário/documentação psicológica já registrado no projeto, sem transformar o sistema em prontuário médico genérico.

## Task 2 — Tipos de registro clínico sem quebrar imutabilidade

O modelo atual `clinical.records` é cifrado e imutável. Evoluir por migration forward-only e contratos de aplicação para classificar registros, por exemplo:
- `session_evolution`;
- `initial_assessment`;
- `treatment_objectives`;
- `referral`;
- `closure`;
- `clinical_note` quando justificado.

A classificação pode ser metadata mínima somente se sua exposição for segura; caso a existência do tipo revele conteúdo sensível a papéis não clínicos, manter toda consulta restrita ao domínio clínico.

Preservar `supersedes_id` para correções. Nunca adicionar UPDATE destrutivo de conteúdo clínico.

**RED DB:**
- insert permitido somente ao clínico AAL2 com permissão;
- update/delete de registro clínico continua impossível;
- correção cria novo registro e liga ao anterior;
- Secretaria/Accounting recebem zero linhas/erro autorizado mesmo se chamarem RPC diretamente.

## Task 3 — Autorização por permissão nas RPCs clínicas

Atualizar/encapsular `list_clinical_record_metadata`, leitura por envelope e demais RPCs para exigir, além do papel clínico/AAL2, a permissão correspondente (`clinical.read`, `clinical.create`, `clinical.supersede`, anexos/documentos).

Evitar depender de permission data fornecida pelo cliente. A função de autorização no banco consulta a identidade autenticada.

Registrar auditoria para:
- abertura do prontuário;
- leitura de registro;
- criação de evolução;
- correção/supersede;
- download/leitura de anexo clínico.

Auditoria não armazena plaintext clínico.

## Task 4 — Workspace de atendimento

Criar rota contextual originada pela consulta, preferencialmente algo como:
- `/atendimentos/[appointmentId]`
ou manter rota existente com `appointmentId` resolvido pelo servidor.

Fluxo:

```text
Agenda
-> card da consulta
-> Iniciar atendimento
-> servidor valida appointment + paciente + profissional + permissão + AAL2
-> workspace abre com paciente/consulta já selecionados
```

Nenhum campo `ID do atendimento`/UUID aparece para a profissional.

Cabeçalho:
- nome preferido/civil;
- idade;
- data/hora;
- serviço;
- modalidade;
- sessão ordinal quando calculável com segurança;
- última consulta;
- próxima consulta.

## Task 5 — Histórico clínico útil durante a sessão

Substituir a timeline puramente técnica por uma linha do tempo profissional:
- data e horário;
- sessão/serviço em linguagem humana;
- tipo de registro;
- conteúdo autorizado da versão vigente;
- indicação de correção quando houver;
- filtros por tipo/período;
- abrir/fechar registros para não sobrecarregar a tela.

O servidor usa `get-clinical-record`/serviço equivalente para descriptografar apenas os registros que o usuário autorizadamente requisita. Evitar carregar indiscriminadamente toda a vida clínica se não for necessária para a tela inicial.

**Busca no prontuário:** P0/P1 dentro do domínio clínico. Implementar somente se houver caminho seguro. Não indexar plaintext em mecanismo administrativo/global. Se busca full-text segura exigir solução maior, entregar filtro por data/tipo primeiro e registrar busca textual como task posterior sem comprometer segurança.

## Task 6 — Resumo do processo terapêutico

No workspace, exibir de forma separada do histórico cronológico:
- demanda/avaliação inicial vigente;
- objetivos ativos;
- início do acompanhamento;
- encaminhamentos ativos quando aplicável;
- último registro/sessão;
- documentos clínicos relevantes.

Esses elementos são clínicos e só existem no payload do perfil autorizado. Secretaria pode saber que existe acompanhamento ativo e datas administrativas, mas não sua demanda/objetivos.

## Task 7 — Formulário da sessão atual

A profissional deve poder registrar uma evolução sem ser obrigada a preencher campos desnecessários.

Estrutura proposta:
- campo principal **Evolução da sessão**;
- temas/demanda trabalhada opcional;
- procedimentos/intervenções opcional;
- mudanças relevantes desde a sessão anterior opcional;
- atualização de objetivos opcional;
- encaminhamentos/decisões opcional;
- combinações/próximos passos opcional;
- tarefa administrativa para Secretaria em estrutura separada, sem copiar conteúdo clínico.

Persistir os campos clínicos dentro do envelope cifrado/versionado segundo o modelo atual. Não criar colunas plaintext para atalhos de UI.

## Task 8 — Iniciar atendimento / estado operacional

Ao clicar **Iniciar atendimento**:
- validar que consulta pode iniciar;
- registrar timestamp/ator;
- atualizar estado operacional para `Em atendimento` pela máquina de estados definida na Onda 2;
- Secretaria passa a ver somente `Em atendimento`;
- abrir workspace clínico após MFA/autorização.

Se MFA não estiver AAL2, redirecionar ao desafio de forma clara e retornar ao atendimento após sucesso.

## Task 9 — Finalizar atendimento atomicamente no domínio correto

**Finalizar atendimento** deve orquestrar com fronteiras claras:
1. validar sessão/consulta;
2. criar registro clínico imutável;
3. registrar auditoria;
4. marcar consulta como realizada via contrato do módulo appointments;
5. criar próximos passos/tarefa administrativa sem conteúdo clínico;
6. emitir evento interno para financeiro/automação quando aplicável.

Evitar transação distribuída com serviços externos. Falha de WhatsApp/NFS-e não pode apagar ou invalidar a evolução clínica.

Idempotência: duplo clique/retry não pode criar duas evoluções finais ou concluir duas vezes a consulta.

## Task 10 — Correção de evolução

Permissão `clinical.supersede`.

UX:
- ação **Corrigir registro**;
- mostra registro vigente;
- exige novo conteúdo/correção;
- cria nova versão com `supersedes_id`;
- timeline apresenta a versão vigente e sinaliza histórico de correções;
- original permanece auditável/imutável.

## Task 11 — Anexos e documentos clínicos

Reutilizar módulo/infra de anexos existentes:
- upload somente por perfil clínico autorizado;
- storage privado;
- MIME/tamanho validados;
- nome de arquivo seguro;
- autorização na leitura/download;
- auditoria;
- nenhum link público permanente.

Separar documentos clínicos de documentos administrativos. Material restrito/testes psicológicos, quando existir, deve ter classificação ainda mais restrita e não aparecer no portal/secretaria por herança genérica.

## Task 12 — Encerramento/retorno de acompanhamento

Permitir encerrar processo terapêutico com registro clínico apropriado e data administrativa. Novo retorno futuro pode criar novo acompanhamento sem apagar o anterior.

A ficha 360 mostra períodos de acompanhamento; somente perfil clínico vê conteúdo clínico de cada período.

## Task 13 — Handoff seguro para Secretaria

Ao finalizar, a Profissional pode gerar ações administrativas estruturadas, como:
- Agendar retorno em X dias/semanas;
- Entrar em contato;
- Enviar formulário já definido;
- Solicitar pagamento/documento administrativo conforme regra.

O texto da evolução **nunca** é copiado automaticamente para a tarefa da Secretaria. A profissional fornece apenas instrução administrativa mínima.

## Task 14 — E2E e testes de vazamento

Cenário Profissional:

```text
login + AAL2
-> Agenda
-> consulta com paciente aguardando
-> Abrir ficha
-> ver histórico clínico anterior
-> Iniciar atendimento
-> registrar nova evolução
-> finalizar
-> refresh
-> abrir prontuário
-> nova sessão aparece vinculada à consulta correta
```

Cenário Secretaria:

```text
login
-> Agenda
-> marcar paciente chegou
-> profissional inicia/finaliza em sessão paralela de teste
-> Secretaria vê estados operacionais e tarefa de retorno
-> não encontra conteúdo da evolução, tipos clínicos sensíveis, ciphertext, IDs do prontuário ou anexos clínicos
```

Cenários de ataque:
- URL clínica direta como Secretaria;
- Server Action clínica direta;
- RPC clínica direta;
- tentativa de baixar anexo clínico;
- usuário clínico AAL1;
- usuário clínico AAL2 com `clinical.read` explicitamente negada.

Todos devem falhar de forma segura, sem leak no corpo/erro/log.

## Gate da Onda 3

```bash
npm run lint
npm run typecheck
npm run test:run
npm run arch:check
npm run modules:check
npm run migrations:check
npm run seed:check
npm run supabase:reset
npm run supabase:test
npm run test:e2e -- --grep "atendimento|clinical|prontu|MFA|secretaria"
npm run build
```

Adicionar inspeção de logs de teste para garantir ausência de plaintext clínico conhecido das fixtures.

Homologação visível obrigatória em duas personas: Profissional AAL2 e Secretaria.

## Critério de saída

A Profissional deve conseguir atender do início ao fim consultando todo o histórico necessário e registrando continuidade terapêutica; a Secretaria deve acompanhar o fluxo operacional sem receber nenhum conteúdo clínico. Nenhum UUID manual, enum técnico ou navegação fora de contexto pode ser requisito para executar uma sessão.