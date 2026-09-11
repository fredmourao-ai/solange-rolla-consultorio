# Onda 4 — Colaboração, Dashboard e Integrações Contextuais — Plano de Implementação

> **Execução:** usar `superpowers:subagent-driven-development`, TDD e worktrees isolados. Financeiro/fiscal/messaging exigem revisão de idempotência e autorização.

**Spec:** `docs/superpowers/specs/2026-09-11-solange-end-to-end-operational-design.md`
**Dependências:** Ondas 0–3 concluídas.

## Objetivo

Fechar a jornada operacional entre Secretaria e Profissional. O sistema deve transferir pendências de forma explícita, apresentar uma home útil para cada papel e trazer formulários, documentos, comunicação, financeiro e fiscal para o contexto do paciente/consulta sem misturar os respectivos domínios.

## Princípios

- Uma pendência deve ter responsável, estado, origem e ação clara.
- Tarefa administrativa não contém prontuário/evolução clínica.
- Dashboard é read model operacional; não duplica estado de domínio.
- Integrações externas são assíncronas, idempotentes, auditáveis e observáveis.
- Permissões por rotina determinam widgets, ações e backend.
- O usuário não precisa visitar módulos técnicos para concluir tarefas comuns, mas os módulos especializados continuam disponíveis para operação avançada.

## Task 1 — Fila de tarefas internas

Criar módulo `work-items`/`tasks` ou equivalente, com ownership explícito.

Campos mínimos:
- id;
- tipo estruturado (`schedule_follow_up`, `contact_patient`, `resend_form`, `collect_payment`, `review_document`, `other_admin`);
- `person_id` opcional/esperado conforme tipo;
- `appointment_id` opcional;
- criado por usuário;
- atribuído a usuário ou papel/equipe;
- título/descrição administrativa curta;
- status `open|in_progress|done|cancelled`;
- due_at opcional;
- timestamps;
- metadata técnica não clínica estritamente necessária.

Não permitir uso desta tabela como campo de evolução clínica. Criar validação/UX para desestimular texto clínico e manter tipos administrativos.

Permissões sugeridas:
- `tasks.read`;
- `tasks.create`;
- `tasks.update`;
- `tasks.assign`.

## Task 2 — Handoff Profissional → Secretaria

No final do atendimento, permitir criar próximos passos estruturados:
- agendar retorno em N dias/semanas;
- entrar em contato;
- reenviar formulário;
- tratar pendência administrativa.

Ao finalizar:
- task é criada com correlação paciente/consulta;
- Secretaria autorizada vê em sua central;
- conteúdo clínico não é propagado;
- concluir task registra ator/data.

Teste obrigatório: um texto sentinela inserido na evolução não pode aparecer no payload/lista de tasks da Secretaria.

## Task 3 — Handoff Secretaria → Profissional

Permitir encaminhar ao profissional tarefas administrativas apropriadas sem usar WhatsApp interno:
- paciente enviou documento administrativo para revisão;
- retorno solicitado;
- confirmação especial necessária;
- outra pendência permitida.

Quando o conteúdo for clínico/restrito, o item deve apontar para recurso clínico protegido sem copiar seu conteúdo para a task administrativa.

## Task 4 — Dashboard da Secretaria

Evoluir `src/app/(protected)/dashboard/` para read model por permissão/papel.

Blocos prioritários:
- **Agenda de hoje** com horário, paciente, confirmação, chegada, status;
- consultas aguardando confirmação;
- pacientes que chegaram;
- cancelamentos/reagendamentos que exigem ação;
- formulários administrativos pendentes;
- tarefas atribuídas à Secretaria;
- retornos para agendar;
- pagamentos pendentes quando `finance.read`;
- NFS-e com ação/erro quando `fiscal.read`;
- aniversários próximos quando permitido.

Cada card oferece ação contextual, não apenas contador.

Nenhum widget contém conteúdo clínico.

## Task 5 — Dashboard da Profissional

Blocos:
- **Meus atendimentos hoje**;
- próximo paciente;
- pacientes aguardando;
- botão **Iniciar atendimento**;
- atendimento iniciado/em aberto;
- registros/evoluções que exigem conclusão conforme regra;
- tarefas atribuídas;
- retornos pendentes;
- documentos clínicos que exigem ação, somente com permissão/AAL2.

Financeiro/fiscal não deve dominar a home clínica mesmo se a proprietária tiver acesso administrativo.

## Task 6 — Dashboard da Administradora

Além dos blocos operacionais permitidos:
- falhas de automação/filas que requerem intervenção;
- usuários desativados/convites pendentes quando aplicável;
- erros fiscais relevantes;
- itens críticos de segurança/auditoria sem expor conteúdo sensível;
- atalhos para Usuários e Acessos.

Evitar transformar dashboard em observability console técnico. Mensagens devem explicar a ação humana necessária.

## Task 7 — Formulários no Paciente 360° e consulta

Reutilizar forms/capabilities/signatures existentes.

No Paciente 360°:
- formulários enviados;
- estado: não iniciado/em preenchimento/concluído/assinado quando aplicável;
- data;
- abrir resultado conforme permissão/classificação;
- reenviar link;
- criar/enviar formulário a partir do contexto.

Na consulta:
- destacar formulário pré-atendimento requerido/pending;
- permitir ação da Secretaria sem abrir módulo técnico;
- resultado sensível deve respeitar segregação definida; não presumir que toda resposta pode ser lida pela Secretaria.

## Task 8 — Centro de documentos contextual

Na ficha do paciente:
- documentos administrativos;
- documentos assinados;
- recibos/NFS-e;
- documentos clínicos somente para perfil autorizado;
- anexos permitidos.

Cada tipo mantém seu storage/authorization original. A UI agrega links/read models, não move arquivos para um bucket público comum.

## Task 9 — Comunicação contextual

Na ficha/consulta, oferecer comunicação administrativa conforme `messaging.*`:
- WhatsApp;
- e-mail;
- histórico de envios/status permitidos;
- confirmação/reagendamento;
- templates apropriados.

Requisitos:
- nenhum dado clínico é enviado automaticamente em template;
- confirmação de consulta não inclui informação sensível desnecessária;
- envio gera outbox/job idempotente;
- UI mostra `enfileirado`, `enviado`, `falhou` em linguagem humana;
- retry não duplica mensagem quando provedor já confirmou envio.

## Task 10 — Financeiro dentro do contexto do paciente

Read model por paciente/consulta:
- valor previsto da consulta;
- recebível associado;
- pagamentos parciais/múltiplos;
- saldo;
- status em linguagem humana;
- pagador/responsável financeiro;
- ações `Registrar pagamento`, `Ajustar` etc. conforme permissão.

Não acoplar `appointment.completed` a `receivable.paid`. Finalizar sessão pode criar/atualizar obrigação prevista segundo regra, mas pagamento continua evento financeiro independente.

Dinheiro sempre em centavos inteiros no domínio.

## Task 11 — Fiscal dentro do contexto do paciente

Quando usuário tiver `fiscal.read`:
- elegibilidade para NFS-e;
- dados fiscais faltantes apresentados como ação administrativa;
- estado da emissão;
- número/documento após emissão;
- erro humano + ação de retry/correção;
- cancelamento/substituição somente com permissão específica.

Emissão externa fica na fila/worker existente. A tela não espera provedor fiscal na transação da consulta/pagamento.

## Task 12 — Pendências acionáveis e prioridades

Criar um read model comum de `needs_attention` que derive itens dos módulos, sem copiar a fonte de verdade:
- confirmação atrasada;
- formulário pendente;
- retorno não agendado;
- recebível vencido;
- erro fiscal;
- task interna vencida.

Cada item tem:
- título humano;
- paciente/contexto quando permitido;
- motivo;
- ação primária;
- prioridade baseada em regra explícita, não IA opaca.

## Task 13 — Atualização de estado sem polling agressivo

Para check-in/handoff, escolher mecanismo compatível com stack atual (Supabase Realtime quando justificado ou refresh inteligente). Evitar polling de segundos sem necessidade.

Aceitação: alteração `Paciente chegou` deve chegar à tela da Profissional em tempo operacional razoável sem depender de refresh manual permanente. Se Realtime aumentar risco/complexidade, usar refresh de curto intervalo somente em Agenda aberta e documentar tradeoff.

## Task 14 — E2E Secretaria ↔ Profissional

Cenário em duas personas com dados sintéticos:

```text
SECRETARIA
login -> Dashboard -> paciente 14:00 -> Confirmar -> Paciente chegou

PROFISSIONAL
login/AAL2 -> Dashboard/Agenda mostra Aguardando atendimento
-> Iniciar atendimento -> registrar evolução -> criar tarefa "Agendar retorno em 15 dias"
-> Finalizar

SECRETARIA
Dashboard muda para Atendimento concluído
-> tarefa de retorno visível
-> agendar retorno
-> registrar pagamento se permitido
-> verificar estado fiscal se permitido
-> concluir tarefa
```

Testes de segurança:
- sentinela clínica não aparece no DOM/rede/payload da Secretaria;
- usuário sem `finance.read` não vê resumo financeiro e URL/action direta falha;
- usuário sem `messaging.send` não dispara outbox;
- usuário sem `fiscal.issue` não enfileira emissão.

## Gate da Onda 4

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
npm run test:e2e -- --grep "dashboard|handoff|task|finance|fiscal|form|message"
npm run build
```

Homologação visível obrigatória alternando Secretaria e Profissional, com refresh/persistência e inspeção de ausência de conteúdo clínico na visão administrativa.

## Critério de saída

Um atendimento completo deve produzir continuidade operacional sem conversas paralelas ou memória informal: quem recebe a paciente sabe o estado; quem atende sabe o contexto; ao finalizar, as pendências administrativas chegam à pessoa correta; financeiro, fiscal, formulários e comunicação aparecem no contexto certo e respeitam permissões.