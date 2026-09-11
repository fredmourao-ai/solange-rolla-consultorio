# Matriz de Acesso por Rotina — Solange Rolla

**Status:** baseline aprovada para implementação; mudanças futuras devem ser versionadas e auditáveis.

## Princípios

- Papel-base define elegibilidade estrutural; permissão individual define a ação operacional.
- `deny` explícito prevalece sobre default do papel.
- Ausência de permissão = negar.
- Usuário inativo = negar tudo.
- Ações marcadas como críticas exigem AAL2/MFA.
- `clinical.*` exige papel clínico elegível + permissão + AAL2 + autorização server-side + RLS/RPC.
- Secretaria e Contabilidade não podem receber conteúdo clínico por override.
- Ocultar menu/botão é apenas UX; backend e banco devem aplicar a mesma decisão.

## Perfis-base

| Perfil | Objetivo |
|---|---|
| `psychologist_owner` | Profissional proprietária, clínica e administradora do consultório |
| `secretary` | Operação administrativa, pacientes, agenda, comunicação, recebimentos e fiscal conforme delegação |
| `accounting` | Leitura/rotinas financeiras e fiscais estritamente necessárias, sem prontuário e sem operação clínica |

## Catálogo inicial

| Área | Permissão | Psicóloga proprietária | Secretaria default | Contabilidade default | AAL2 | Observação |
|---|---|---:|---:|---:|---:|---|
| Pacientes | `patients.read` | Sim | Sim | Não | Não | Contabilidade usa read model fiscal mínimo |
| Pacientes | `patients.create` | Sim | Sim | Não | Não | |
| Pacientes | `patients.update` | Sim | Sim | Não | Não | |
| Pacientes | `patients.archive` | Sim | Não | Não | Não | Pode ser delegado |
| Pacientes | `patients.relationships.manage` | Sim | Sim | Não | Não | Responsáveis legal/financeiro/fiscal |
| Agenda | `appointments.read` | Sim | Sim | Não | Não | |
| Agenda | `appointments.create` | Sim | Sim | Não | Não | |
| Agenda | `appointments.update` | Sim | Sim | Não | Não | |
| Agenda | `appointments.reschedule` | Sim | Sim | Não | Não | |
| Agenda | `appointments.cancel` | Sim | Sim | Não | Não | |
| Agenda | `appointments.confirm` | Sim | Sim | Não | Não | |
| Agenda | `appointments.checkin` | Sim | Sim | Não | Não | |
| Agenda | `appointments.no_show` | Sim | Sim | Não | Não | |
| Agenda | `appointments.complete` | Sim | Não | Não | Não | Profissional por padrão |
| Agenda | `appointments.blocks.manage` | Sim | Sim | Não | Não | Delegável |
| Clínico | `clinical.read` | Sim | **Nunca elegível** | **Nunca elegível** | Sim | Barreira estrutural |
| Clínico | `clinical.create` | Sim | **Nunca elegível** | **Nunca elegível** | Sim | Barreira estrutural |
| Clínico | `clinical.supersede` | Sim | **Nunca elegível** | **Nunca elegível** | Sim | Registro imutável; correção por versão |
| Clínico | `clinical.attachments.manage` | Sim | **Nunca elegível** | **Nunca elegível** | Sim | |
| Clínico | `clinical.documents.manage` | Sim | **Nunca elegível** | **Nunca elegível** | Sim | |
| Formulários | `forms.read` | Sim | Sim* | Não | Não | *Somente respostas/classificação administrativa permitida |
| Formulários | `forms.send` | Sim | Sim | Não | Não | |
| Formulários | `forms.manage` | Sim | Não | Não | Não | Delegável |
| Documentos | `documents.read` | Sim | Sim* | Sim* | Não | Somente classes autorizadas |
| Documentos | `documents.create` | Sim | Sim* | Não | Não | Administrativos; clínicos usam permissão clínica |
| Documentos | `documents.send` | Sim | Sim | Não | Não | |
| Comunicação | `messaging.read` | Sim | Sim | Não | Não | Histórico administrativo |
| Comunicação | `messaging.send` | Sim | Sim | Não | Não | |
| Comunicação | `messaging.templates.manage` | Sim | Não | Não | Não | Delegável |
| Financeiro | `finance.read` | Sim | Sim | Sim | Não | Escopo por política/read model |
| Financeiro | `finance.receive` | Sim | Sim | Não | Não | |
| Financeiro | `finance.adjust` | Sim | Não | Não | Não | Delegável |
| Financeiro | `finance.refund` | Sim | Não | Não | Sim | Crítica |
| Fiscal | `fiscal.read` | Sim | Sim | Sim | Não | |
| Fiscal | `fiscal.issue` | Sim | Sim | Não | Não | Delegável |
| Fiscal | `fiscal.cancel` | Sim | Não | Não | Sim | Crítica |
| Eventos | `events.read` | Sim | Sim | Não | Não | |
| Eventos | `events.manage` | Sim | Sim | Não | Não | |
| Relatórios | `reports.operational.read` | Sim | Sim | Não | Não | |
| Relatórios | `reports.financial.read` | Sim | Não | Sim | Não | Delegável à Secretaria |
| Relatórios | `reports.fiscal.read` | Sim | Não | Sim | Não | Delegável à Secretaria |
| Usuários | `users.read` | Sim | Não | Não | Não | Delegável apenas se necessário |
| Usuários | `users.manage` | Sim | Não | Não | Sim | Crítica |
| Acessos | `permissions.manage` | Sim | Não | Não | Sim | Não permitir autoelevação/lockout |
| Configurações | `settings.manage` | Sim | Não | Não | Sim* | AAL2 para configurações críticas |
| Auditoria | `audit.read` | Sim | Não | Não | Sim | Conteúdo auditado sem plaintext clínico |
| Tarefas | `tasks.read` | Sim | Sim | Não | Não | Futuro catálogo deve manter mesma semântica |
| Tarefas | `tasks.create` | Sim | Sim | Não | Não | |
| Tarefas | `tasks.update` | Sim | Sim | Não | Não | |
| Tarefas | `tasks.assign` | Sim | Sim | Não | Não | |

## Regras de override

Estados na UI por permissão:
- **Padrão**: herda default do papel-base;
- **Permitir**: override `true`, somente se o papel for estruturalmente elegível;
- **Negar**: override `false`, sempre prevalece.

Exemplos:
- Secretaria com `appointments.create=deny`: não vê **Nova consulta**, não consegue usar rota/Server Action/RPC para criar.
- Secretaria com `reports.financial.read=allow`: pode ver relatório financeiro se read model/escopo também autorizar.
- Secretaria com `clinical.read=allow`: resultado efetivo continua **false**, porque papel não clínico é estruturalmente inelegível.

## Administração de acessos

A tela **Usuários e Acessos** deve mostrar para cada rotina:
- valor padrão do papel;
- override atual;
- resultado efetivo;
- indicação `MFA obrigatório` quando aplicável;
- bloqueio visual para permissões estruturalmente inelegíveis;
- histórico de alteração.

Toda alteração registra: ator, usuário alvo, chave da permissão, valor anterior, novo valor, horário e correlação. Não registrar senha, token, segredo, conteúdo clínico ou PII desnecessária.

## Gate de segurança

Uma permissão só é considerada implementada quando testada em quatro superfícies:
1. menu/ação visual;
2. rota/Server Action/API;
3. RPC/RLS no banco quando aplicável;
4. auditoria e comportamento pós-alteração.
