# Onda 2 — Agenda Profissional — Plano de Implementação

> **Execução:** `superpowers:subagent-driven-development`, TDD, worktree por task e revisão independente para migration/RLS.

**Spec:** `docs/superpowers/specs/2026-09-11-solange-end-to-end-operational-design.md`
**Dependência:** Onda 1 Paciente 360° concluída.

## Objetivo

Fazer da Agenda o centro da rotina compartilhada entre Secretaria e Profissional. Agendamento, recorrência, confirmação, chegada, reagendamento, cancelamento, falta, bloqueios e início do atendimento devem nascer da própria agenda, sem exigir rota escondida ou conhecimento técnico.

## Princípios

- Secretaria e Profissional usam a mesma fonte de verdade, com ações condicionadas às permissões.
- Ações de agenda não revelam conteúdo clínico.
- Estados da consulta, financeiro e fiscal continuam independentes.
- Políticas históricas de cancelamento permanecem snapshot/versionadas.
- Timezone de negócio `America/Sao_Paulo`; persistência `timestamptz`/UTC.
- Recorrência gera ocorrências independentes ligadas à série.
- Conflito de agenda é validado no servidor/banco, não apenas no front-end.
- Toda alteração relevante gera histórico/auditoria.

## Permissões

- `appointments.read`
- `appointments.create`
- `appointments.update`
- `appointments.reschedule`
- `appointments.cancel`
- `appointments.confirm`
- `appointments.checkin`
- `appointments.no_show`
- `appointments.complete`
- `appointments.blocks.manage`

## Task 1 — Consolidar máquina de estados

Revisar `src/modules/appointments/domain/` e migrations atuais. Definir transições permitidas em um único contrato de domínio e mapear enums técnicos para linguagem humana.

Estados mínimos de negócio/operacionais, reconciliados com o schema existente:
- Agendada;
- Aguardando confirmação;
- Confirmada;
- Paciente chegou;
- Em atendimento;
- Realizada;
- Reagendamento solicitado;
- Reagendada;
- Cancelada no prazo;
- Cancelada fora do prazo;
- Faltou;
- Cancelada pela profissional.

Se `checked_in`/`in_progress` não puderem ser incorporados ao status existente sem ambiguidade, criar um estado operacional separado com contrato explícito. Não duplicar a mesma verdade em duas colunas sem uma regra clara.

**RED:** testes de todas as transições válidas e inválidas; nenhuma transição direta arbitrária deve ser aceita.

## Task 2 — Modelo de profissional, modalidade e contexto da consulta

Reconciliar `appointments` com necessidade de operação multiusuário. Se ainda ausentes, criar migration forward-only para:
- `professional_user_id` ou referência equivalente;
- modalidade `in_person|online`;
- observação administrativa opcional, claramente não clínica;
- metadados de origem/série quando necessários.

A consulta continua relacionada a `person_id`, `service_id`, início/fim e snapshot de política.

**RLS:** `appointments.read` governa leitura; mutações exigem a permissão específica. Profissional não deve automaticamente editar agenda de outro profissional se o modelo futuramente tiver múltiplos profissionais sem permissão adequada.

## Task 3 — Séries recorrentes

Criar entidade `appointment_series` ou equivalente com:
- id;
- paciente;
- serviço;
- profissional;
- modalidade;
- regra de recorrência estruturada;
- início;
- fim por data ou quantidade;
- criado por;
- timestamps.

Cada ocorrência em `appointments` recebe `series_id` opcional. Não calcular dinamicamente consultas passadas sem materializá-las.

Operações suportadas:
- semanal;
- quinzenal;
- intervalo personalizado razoável;
- quantidade de ocorrências;
- data final;
- alterar somente esta ocorrência;
- alterar esta e futuras quando implementado com transação/validação segura.

**RED:** alterar uma ocorrência intermediária não modifica ocorrências anteriores/não escolhidas; conflito em uma ocorrência deve impedir ou retornar lista clara para decisão, nunca sobrescrever silenciosamente.

## Task 4 — Bloqueios e disponibilidade

Criar `schedule_blocks` ou estrutura equivalente:
- profissional;
- starts_at/ends_at;
- tipo (`unavailable`, `break`, `vacation`, `other`);
- descrição administrativa curta;
- recorrência apenas se realmente suportada;
- created_by.

Permissão `appointments.blocks.manage`.

Conflito considera consultas não canceladas e bloqueios relevantes. Criar índice/constraint/RPC apropriada para reduzir condição de corrida.

## Task 5 — Nova consulta diretamente da Agenda

**Modificar:**
- `src/app/(protected)/agenda/page.tsx`
- `src/modules/appointments/ui/calendar.tsx`
- `src/modules/appointments/ui/appointment-dialog.tsx`
- Server Actions/read models de agenda.

UX:
- `Hoje`, `Dia`, `Semana`, `Mês`;
- botão primário **Nova consulta**;
- clicar horário vazio pré-preenche data/hora;
- busca/seleção de paciente;
- serviço define duração/valor default, editável somente conforme regra;
- profissional, modalidade, data/hora, recorrência;
- conflito retorna mensagem humana e opções seguras;
- salvar atualiza a agenda sem rota escondida.

A rota `/agenda/gerenciar` pode permanecer para compatibilidade/admin, mas não é mais o único caminho.

## Task 6 — Card/detalhe da consulta

Ao clicar em uma consulta, mostrar contexto operacional:
- paciente;
- horário e duração;
- serviço;
- modalidade;
- profissional;
- status humano;
- confirmação;
- formulário pré-atendimento quando existir;
- situação financeira resumida somente se o usuário tiver permissão;
- última/próxima consulta quando útil.

Ações por permissão:
- Abrir paciente;
- Editar;
- Confirmar;
- Registrar chegada;
- Reagendar;
- Cancelar;
- Registrar falta;
- Iniciar atendimento (somente perfil clínico elegível + permissão);
- Financeiro relacionado.

Nenhum UUID aparece como campo de usuário.

## Task 7 — Reagendamento e cancelamento

Reutilizar e fortalecer lógica existente de `appointment-management` e política de cancelamento.

Reagendamento deve:
- preservar histórico original;
- registrar quem, quando e origem;
- validar conflito;
- recalcular deadline/snapshot somente conforme regra aprovada para o novo horário;
- não alterar consultas anteriores de uma série sem escolha explícita.

Cancelamento deve:
- classificar no prazo/fora do prazo usando snapshot histórico;
- não acoplar cobrança como mudança de status financeiro automática irreversível; disparar regra/evento apropriado;
- registrar razão administrativa opcional sem conteúdo clínico.

## Task 8 — Confirmação e lembretes

Expor no card o estado das confirmações existentes e integrar com messaging/automations sem chamadas externas síncronas na transação do agendamento.

- envio/reenvio deve ser idempotente;
- confirmação pública preserva capability token/segurança existente;
- respostas confirmam/reagendam/cancelam somente transições permitidas;
- Secretaria vê pendência e ação de reenviar conforme permissão.

## Task 9 — Check-in / chegada e handoff

Implementar **Paciente chegou** como evento/estado operacional auditável.

Quando Secretaria registra chegada:
- Agenda da Secretaria mostra `Aguardando atendimento`;
- Agenda da Profissional mostra o mesmo estado e ação **Iniciar atendimento**;
- nenhum dado clínico é criado ou revelado;
- timestamp de chegada pode alimentar métricas operacionais futuras.

A transição para `Em atendimento` será acionada pela Onda 3.

## Task 10 — Visualizações e usabilidade

Garantir:
- densidade legível em 1366×768;
- scroll apropriado do calendário;
- indicação clara de horário atual;
- navegação por teclado e foco nos diálogos;
- estados por texto/ícone, não apenas cor;
- mobile com lista/dia útil em vez de tentar comprimir uma grade impossível;
- loading/empty/error states humanos.

## Task 11 — E2E de Agenda

Cenário Secretaria:

```text
login
-> Agenda
-> Nova consulta
-> selecionar paciente sintético
-> selecionar serviço/data/hora
-> criar recorrência de 3 ocorrências
-> abrir segunda ocorrência
-> reagendar somente esta
-> confirmar
-> registrar chegada
-> refresh
-> confirmar persistência e histórico
```

Cenário Profissional:

```text
login
-> Agenda
-> visualizar consultas autorizadas
-> abrir paciente
-> bloquear horário
-> tentar criar consulta em conflito e receber bloqueio
-> remover/ajustar bloqueio conforme permissão
```

Cenário negativo:
- `appointments.read` negada: menu/rota/lista bloqueados;
- `appointments.create` negada: botão ausente e Server Action rejeita chamada direta;
- `appointments.checkin` negada: chegada não pode ser registrada por chamada direta.

## Gate da Onda 2

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
npm run test:e2e -- --grep "Agenda|consulta|appointment|check-in|recorr"
npm run build
```

Homologação visível obrigatória como Secretaria e Profissional. Comprovar criação, recorrência, reagendamento, conflito, confirmação, chegada e persistência após refresh.

## Critério de saída

A Agenda deve permitir operar um dia de consultório sem acessar rotas técnicas de gerenciamento e sem depender de mensagens externas entre Secretaria e Profissional para saber quem está confirmado, chegou ou está pronto para atendimento.