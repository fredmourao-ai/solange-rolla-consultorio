# Matriz de Aceitação Ponta a Ponta — Solange Rolla

**Status:** template de homologação — NÃO pré-marcar PASS
**Programa:** recuperação operacional 2026-09-11
**Spec:** `docs/superpowers/specs/2026-09-11-solange-end-to-end-operational-design.md`
**Plano mestre:** `docs/superpowers/plans/2026-09-11-00-solange-end-to-end-execution-index.md`

## Metadados da execução

- SHA candidato: `<preencher>`
- URL/ambiente: `<preencher>`
- Data/hora: `<preencher>`
- Executor: `<preencher>`
- Navegador/viewport: `<preencher>`
- Banco/schema: `<preencher>`
- Dados: somente sintéticos

## Convenção

- `PASS`: executado e comprovado no SHA/ambiente acima.
- `FAIL`: comportamento divergiu do esperado.
- `BLOCKED`: impedimento externo real, com evidência e ação externa registrada.
- `NOT RUN`: ainda não executado.

## A. Administradora / usuários e permissões

| ID | Cenário | Resultado | Evidência | Observação |
|---|---|---|---|---|
| A01 | Login de administradora com MFA/AAL2 | NOT RUN | | |
| A02 | Abrir Usuários e Acessos | NOT RUN | | |
| A03 | Visualizar catálogo por área em linguagem humana | NOT RUN | | |
| A04 | Alterar permissão para Padrão/Permitir/Negar | NOT RUN | | |
| A05 | `deny` explícito prevalece sobre default allow | NOT RUN | | |
| A06 | Conceder permissão não clínica elegível | NOT RUN | | |
| A07 | Impedir `clinical.*` para Secretaria/Contabilidade | NOT RUN | | |
| A08 | Remover `appointments.create`, autenticar como alvo e ocultar Nova consulta | NOT RUN | | |
| A09 | Tentar URL/Server Action direta sem permissão e bloquear | NOT RUN | | |
| A10 | Restaurar permissão e comprovar acesso | NOT RUN | | |
| A11 | Desativar usuário e invalidar acesso | NOT RUN | | |
| A12 | Auditar ator, alvo, permissão, antes/depois | NOT RUN | | |
| A13 | Impedir lockout do último administrador elegível | NOT RUN | | |

## B. Secretaria / Paciente 360°

| ID | Cenário | Resultado | Evidência | Observação |
|---|---|---|---|---|
| S01 | Menu mostra Pacientes, não Pessoas | NOT RUN | | |
| S02 | Sidebar rola em 1366×768 e itens inferiores são alcançáveis | NOT RUN | | |
| S03 | Criar paciente sintético completo | NOT RUN | | |
| S04 | Buscar por nome | NOT RUN | | |
| S05 | Buscar por CPF | NOT RUN | | |
| S06 | Buscar por telefone/e-mail | NOT RUN | | |
| S07 | Abrir ficha 360° | NOT RUN | | |
| S08 | Editar dados administrativos e salvar | NOT RUN | | |
| S09 | Refresh confirma persistência | NOT RUN | | |
| S10 | Criar/alterar responsável legal/financeiro/fiscal | NOT RUN | | |
| S11 | Visualizar última e próxima consulta | NOT RUN | | |
| S12 | Ausência de conteúdo clínico na ficha da Secretaria | NOT RUN | | |
| S13 | Usuário sem `patients.update` falha por UI e backend | NOT RUN | | |

## C. Secretaria / Agenda profissional

| ID | Cenário | Resultado | Evidência | Observação |
|---|---|---|---|---|
| G01 | Agenda abre em Hoje/Dia/Semana/Mês | NOT RUN | | |
| G02 | Nova consulta é ação primária visível | NOT RUN | | |
| G03 | Clique em horário livre pré-preenche data/hora | NOT RUN | | |
| G04 | Criar consulta única | NOT RUN | | |
| G05 | Criar recorrência semanal/quinzenal | NOT RUN | | |
| G06 | Reagendar somente uma ocorrência preservando demais | NOT RUN | | |
| G07 | Bloquear horário | NOT RUN | | |
| G08 | Conflito de horário é bloqueado no servidor/banco | NOT RUN | | |
| G09 | Confirmar consulta | NOT RUN | | |
| G10 | Registrar Paciente chegou | NOT RUN | | |
| G11 | Registrar falta/cancelamento conforme permissão | NOT RUN | | |
| G12 | Estados são humanos, sem enums técnicos | NOT RUN | | |
| G13 | Nenhum UUID é exigido na rotina | NOT RUN | | |

## D. Profissional / Atendimento e prontuário

| ID | Cenário | Resultado | Evidência | Observação |
|---|---|---|---|---|
| P01 | Login profissional e MFA/AAL2 | NOT RUN | | |
| P02 | Agenda mostra paciente aguardando após check-in | NOT RUN | | |
| P03 | Abrir Paciente 360° e contexto administrativo permitido | NOT RUN | | |
| P04 | Abrir Prontuário com `clinical.read` | NOT RUN | | |
| P05 | Ler anamnese/demanda/objetivos/sessões anteriores | NOT RUN | | |
| P06 | Iniciar atendimento diretamente da consulta | NOT RUN | | |
| P07 | Appointment/patient são resolvidos sem digitar IDs | NOT RUN | | |
| P08 | Registrar evolução da sessão | NOT RUN | | |
| P09 | Finalizar atendimento | NOT RUN | | |
| P10 | Refresh e reabertura mostram nova evolução na consulta correta | NOT RUN | | |
| P11 | Corrigir registro cria supersede e preserva original | NOT RUN | | |
| P12 | Secretaria não recebe plaintext/metadata clínica indevida | NOT RUN | | |
| P13 | AAL1 é bloqueado em conteúdo clínico | NOT RUN | | |
| P14 | AAL2 com `clinical.read` negada é bloqueado | NOT RUN | | |

## E. Handoff Secretaria ↔ Profissional

| ID | Cenário | Resultado | Evidência | Observação |
|---|---|---|---|---|
| H01 | Secretaria registra chegada | NOT RUN | | |
| H02 | Profissional vê Aguardando atendimento | NOT RUN | | |
| H03 | Profissional inicia; Secretaria vê Em atendimento | NOT RUN | | |
| H04 | Profissional finaliza; Secretaria vê Atendimento concluído | NOT RUN | | |
| H05 | Profissional cria tarefa administrativa de retorno | NOT RUN | | |
| H06 | Secretaria recebe e conclui tarefa | NOT RUN | | |
| H07 | Sentinela da evolução não aparece na task administrativa | NOT RUN | | |
| H08 | Retorno agendado aparece no paciente e Agenda | NOT RUN | | |

## F. Formulários, documentos e comunicação

| ID | Cenário | Resultado | Evidência | Observação |
|---|---|---|---|---|
| F01 | Formulário pré-atendimento aparece no contexto da consulta | NOT RUN | | |
| F02 | Secretaria consegue enviar/reenviar quando autorizada | NOT RUN | | |
| F03 | Resposta sensível respeita classificação/permissão | NOT RUN | | |
| F04 | Documento assinado permanece imutável/evidenciável | NOT RUN | | |
| F05 | Documento clínico não aparece para Secretaria | NOT RUN | | |
| F06 | WhatsApp/e-mail é enfileirado e status é humano | NOT RUN | | |
| F07 | Retry não duplica envio confirmado | NOT RUN | | |
| F08 | Usuário sem `messaging.send` não cria outbox | NOT RUN | | |

## G. Financeiro e Fiscal

| ID | Cenário | Resultado | Evidência | Observação |
|---|---|---|---|---|
| M01 | Consulta mostra recebível contextual quando permitido | NOT RUN | | |
| M02 | Registrar pagamento | NOT RUN | | |
| M03 | Pagamento parcial/múltiplo preserva saldo correto | NOT RUN | | |
| M04 | Finalizar consulta não marca pagamento automaticamente | NOT RUN | | |
| M05 | NFS-e aparece no contexto quando permitida | NOT RUN | | |
| M06 | Falta de dado fiscal gera ação humana, não erro técnico cru | NOT RUN | | |
| M07 | Retry fiscal é idempotente | NOT RUN | | |
| M08 | Usuário sem `finance.read` não vê/consulta finanças | NOT RUN | | |
| M09 | Usuário sem `fiscal.issue` não enfileira emissão | NOT RUN | | |

## H. Dashboard por perfil

| ID | Cenário | Resultado | Evidência | Observação |
|---|---|---|---|---|
| D01 | Secretaria vê agenda e pendências administrativas acionáveis | NOT RUN | | |
| D02 | Profissional vê atendimentos e ações clínicas autorizadas | NOT RUN | | |
| D03 | Administradora vê usuários/acessos/falhas relevantes | NOT RUN | | |
| D04 | Widgets respeitam permissões, não só papel | NOT RUN | | |
| D05 | Dashboard não expõe conteúdo clínico a perfis administrativos | NOT RUN | | |

## I. Segurança, persistência e resiliência

| ID | Cenário | Resultado | Evidência | Observação |
|---|---|---|---|---|
| Q01 | RLS fail-closed para permissão desconhecida | NOT RUN | | |
| Q02 | Usuário inativo é bloqueado | NOT RUN | | |
| Q03 | Clinical plaintext ausente de logs/analytics/query string/local storage | NOT RUN | | |
| Q04 | Anexo clínico não possui link público permanente | NOT RUN | | |
| Q05 | Duplo clique em criar consulta não gera duplicidade indevida | NOT RUN | | |
| Q06 | Retry de finalizar atendimento não cria duas evoluções finais | NOT RUN | | |
| Q07 | Retry financeiro/fiscal/comunicação é idempotente | NOT RUN | | |
| Q08 | Migrações aplicam do zero | NOT RUN | | |
| Q09 | Migrações históricas não foram reescritas | NOT RUN | | |
| Q10 | Build e suites completas verdes | NOT RUN | | |

## J. UX, responsividade e linguagem

| ID | Cenário | Resultado | Evidência | Observação |
|---|---|---|---|---|
| U01 | Desktop 1366×768 utilizável sem menu cortado | NOT RUN | | |
| U02 | Mobile suportado com navegação funcional | NOT RUN | | |
| U03 | Fluxos principais navegáveis por teclado | NOT RUN | | |
| U04 | Estados não dependem somente de cor | NOT RUN | | |
| U05 | Erros/empty/loading em português humano | NOT RUN | | |
| U06 | Nenhum enum/UUID/código técnico na rotina normal | NOT RUN | | |
| U07 | Ações primárias estão no contexto certo | NOT RUN | | |

## Gate de conclusão

**Não pode haver `FAIL` em requisito P0/P1.** `BLOCKED` somente é aceitável quando a causa é externa e incontornável no ambiente disponível e estiver documentada com ação externa e ponto exato de retomada.

Resultado final: `<CONCLUÍDO | BLOQUEADO | NÃO EXECUTADO>`
