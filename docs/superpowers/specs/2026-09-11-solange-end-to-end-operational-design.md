# Solange Rolla — Design Operacional Ponta a Ponta

**Status:** aprovado para documentação e execução por ondas
**Data:** 2026-09-11
**Issue guarda-chuva:** #113
**Arquitetura base:** `docs/ARCHITECTURE.md`
**Complementa:** `docs/superpowers/specs/2026-09-11-p0-operational-recovery-design.md`

## 1. Objetivo

Transformar o Solange em um sistema utilizável durante toda a rotina real do consultório, por dois perfis centrais: **Profissional** e **Secretaria**. O produto deve ligar cadastro, agenda, atendimento, histórico, formulários, documentos, comunicação, financeiro e fiscal em uma jornada única, sem expor termos técnicos, IDs internos ou módulos isolados como se fossem fluxos independentes.

O sistema não será reescrito. A direção oficial permanece: monólito modular Next.js + TypeScript, Supabase/PostgreSQL como fonte de verdade, RLS, MFA, filas duráveis e workers assíncronos.

## 2. Princípio operacional

Toda rotina deve responder a quatro perguntas:

1. O que a **Secretaria** precisa ver e fazer?
2. O que a **Profissional** precisa ver e fazer?
3. Como uma entrega a próxima ação para a outra sem perder contexto?
4. Como impedir que uma permissão administrativa revele conteúdo clínico indevido?

Nenhuma rotina será considerada pronta se funcionar apenas para um dos dois perfis.

## 3. Jornada principal do consultório

```text
Secretaria cadastra/atualiza paciente
        ↓
Secretaria ou Profissional agenda consulta
        ↓
Sistema envia formulário/termo e confirmação quando configurado
        ↓
Secretaria acompanha confirmação e chegada
        ↓
Profissional abre a consulta e inicia atendimento
        ↓
Profissional consulta histórico e registra evolução
        ↓
Profissional finaliza atendimento e cria próximos passos
        ↓
Secretaria recebe pendências administrativas
        ↓
Pagamento / NFS-e / comunicação / novo agendamento
        ↓
Próxima consulta preserva continuidade do histórico
```

## 4. Usuários, perfis e permissões por rotina

### 4.1 Modelo

O controle de acesso terá duas camadas:

- **papel-base**: define a natureza do usuário e limites estruturais;
- **permissões individuais por rotina**: autorizam ou negam ações específicas para aquele usuário.

Papéis-base existentes são preservados: `psychologist_owner`, `secretary`, `accounting`. Novos papéis só serão adicionados se um caso real exigir.

A administradora poderá abrir **Usuários e Acessos** e definir permissões para cada rotina. Perfis-base fornecem defaults; overrides individuais permitem autorizar ou negar ações. Uma negação explícita vence uma permissão concedida por padrão.

### 4.2 Barreiras estruturais

Permissões não podem transformar um papel não clínico em profissional clínico. Conteúdo clínico continua exigindo simultaneamente:

- usuário ativo;
- papel clínico elegível;
- permissão clínica correspondente;
- AAL2/MFA quando exigido;
- autorização no servidor;
- RLS/RPC no banco.

### 4.3 Catálogo inicial de permissões

**Pacientes**
- `patients.read`
- `patients.create`
- `patients.update`
- `patients.archive`
- `patients.relationships.manage`

**Agenda**
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

**Clínico**
- `clinical.read`
- `clinical.create`
- `clinical.supersede`
- `clinical.attachments.manage`
- `clinical.documents.manage`

**Formulários e documentos**
- `forms.read`
- `forms.send`
- `forms.manage`
- `documents.read`
- `documents.create`
- `documents.send`

**Comunicação**
- `messaging.read`
- `messaging.send`
- `messaging.templates.manage`

**Financeiro/Fiscal**
- `finance.read`
- `finance.receive`
- `finance.adjust`
- `finance.refund`
- `fiscal.read`
- `fiscal.issue`
- `fiscal.cancel`

**Eventos/Relatórios/Administração**
- `events.read`
- `events.manage`
- `reports.operational.read`
- `reports.financial.read`
- `reports.fiscal.read`
- `users.read`
- `users.manage`
- `permissions.manage`
- `settings.manage`
- `audit.read`

### 4.4 UX do módulo Usuários e Acessos

Tela `/usuarios`:
- lista usuários;
- nome, papel-base, situação, última atividade permitida quando disponível;
- criar usuário;
- ativar/desativar;
- abrir permissões.

Tela `/usuarios/[userId]`:
- identificação;
- papel-base;
- status ativo;
- permissões agrupadas por área;
- cada rotina com `Padrão`, `Permitir`, `Negar`;
- aviso claro para ações clínicas e administrativas críticas;
- histórico de alterações de permissão.

Alterações de permissão crítica exigem MFA e geram auditoria com ator, alvo, permissão, valor anterior, novo valor e correlação.

## 5. Navegação e linguagem

A UI deve refletir o trabalho real.

### 5.1 Menu

- `Pessoas` passa a ser exibido como **Pacientes**;
- rota `/pessoas` pode permanecer internamente para compatibilidade;
- sidebar desktop possui `100dvh` e rolagem própria;
- itens sem permissão não aparecem;
- esconder item nunca substitui autorização server-side;
- títulos, botões e estados usam português simples.

### 5.2 Ações primárias

Ações comuns não podem ficar escondidas em rotas de gerenciamento:

- **Novo paciente**;
- **Nova consulta**;
- **Iniciar atendimento**;
- **Editar cadastro**;
- **Agendar retorno**;
- **Registrar pagamento**;
- **Emitir NFS-e**.

## 6. Paciente 360°

A ficha do paciente é o principal ponto de entrada contextual.

### 6.1 Estrutura

`/pessoas/[personId]` apresenta abas/seções condicionadas às permissões:

- **Resumo**;
- **Cadastro**;
- **Consultas**;
- **Prontuário**;
- **Formulários**;
- **Documentos**;
- **Financeiro**;
- **Comunicação**.

### 6.2 Resumo

Deve apresentar:
- nome civil e preferido;
- idade/data de nascimento;
- telefone/WhatsApp/e-mail;
- situação do acompanhamento;
- data de início;
- modalidade habitual;
- frequência habitual;
- última consulta;
- próxima consulta;
- quantidade de consultas realizadas;
- pendências administrativas;
- cadastro fiscal completo/incompleto;
- ações rápidas autorizadas.

### 6.3 Cadastro administrativo

Campos P0/P1:
- nome civil;
- nome preferido/social;
- nascimento;
- CPF;
- e-mail;
- telefone principal;
- WhatsApp/telefone alternativo quando necessário;
- endereço completo: logradouro, número, complemento, bairro, cidade, UF, CEP;
- profissão/ocupação opcional quando operacionalmente útil;
- contato de emergência: nome, vínculo e telefone;
- responsável legal;
- responsável financeiro;
- tomador fiscal;
- canal preferido;
- preferência de mensagem de aniversário;
- origem/indicação;
- observações administrativas estritamente não clínicas.

Dados clínicos não entram nesta estrutura administrativa.

### 6.4 Acompanhamento

Introduzir conceito de acompanhamento/processo terapêutico:
- paciente;
- profissional responsável;
- status: `active`, `paused`, `completed`, `discontinued`;
- data de início;
- data de encerramento quando houver;
- modalidade;
- frequência planejada;
- serviço padrão;
- observação administrativa opcional.

Demanda, objetivos terapêuticos e evolução pertencem ao domínio clínico e seguem proteção L3.

## 7. Agenda de consultas

A Agenda é núcleo P0 e deve funcionar tanto para Secretaria quanto para Profissional.

### 7.1 Visualizações

- Hoje;
- Dia;
- Semana;
- Mês;
- navegação rápida por data;
- busca por paciente;
- filtros conforme necessidade real.

### 7.2 Criação

Botão **Nova consulta** no cabeçalho e criação contextual ao clicar horário livre.

Campos:
- paciente;
- serviço/tipo de atendimento;
- profissional quando aplicável;
- data e hora;
- duração;
- modalidade `presencial`/`online`;
- valor quando aplicável;
- recorrência;
- observação administrativa.

### 7.3 Recorrência

Permitir:
- semanal;
- quinzenal;
- intervalo personalizado;
- quantidade de ocorrências ou data final.

Cada ocorrência é um agendamento independente ligado a uma série. Alterar uma ocorrência não reescreve automaticamente o histórico das demais. Operações sobre série exigem escolha explícita: `somente esta`, `esta e futuras`, quando suportado com segurança.

### 7.4 Bloqueios e conflitos

- impedir sobreposição incompatível;
- permitir bloqueio de almoço, férias, compromisso e indisponibilidade;
- preservar timezone `America/Sao_Paulo` na regra de negócio;
- persistir UTC/timestamptz conforme arquitetura existente.

### 7.5 Estados em linguagem humana

Mapear enums técnicos para:
- Agendada;
- Aguardando confirmação;
- Confirmada;
- Paciente chegou;
- Em atendimento;
- Realizada;
- Faltou;
- Cancelada no prazo;
- Cancelada fora do prazo;
- Reagendamento solicitado;
- Reagendada.

### 7.6 Card da consulta

Ações condicionadas por permissão:
- Abrir paciente;
- Editar;
- Confirmar;
- Registrar chegada;
- Reagendar;
- Cancelar;
- Registrar falta;
- Iniciar atendimento;
- Finalizar quando aplicável;
- Financeiro relacionado.

Nenhum ID técnico deve ser exigido do usuário.

## 8. Atendimento profissional

### 8.1 Entrada

A profissional inicia por:

`Agenda -> Consulta -> Iniciar atendimento`

O sistema já conhece paciente e consulta.

### 8.2 Workspace

Cabeçalho:
- paciente;
- idade;
- data/horário da consulta;
- serviço;
- número ordinal da sessão quando calculável;
- última consulta;
- próxima consulta.

Área de histórico:
- acompanhamento atual;
- anamnese/avaliação inicial;
- demanda e objetivos ativos;
- sessões anteriores;
- documentos/encaminhamentos permitidos;
- filtros e busca clínica autorizada.

Área da sessão atual:
- evolução livre;
- temas/demanda trabalhada opcional;
- procedimentos/intervenções opcional;
- mudanças relevantes;
- atualização de objetivos;
- encaminhamentos/decisões;
- combinações/próximos passos;
- pedido administrativo para secretaria.

A estrutura deve ajudar sem obrigar a profissional a preencher campos inúteis.

### 8.3 Finalização

Ao **Finalizar atendimento**:
- validar conteúdo mínimo exigido pela regra clínica;
- criar registro clínico imutável/versionado;
- associar automaticamente ao appointment e acompanhamento;
- marcar consulta como realizada pela transição autorizada;
- gerar auditoria;
- apresentar próximos passos;
- financeiro permanece independente e segue regra própria.

## 9. Prontuário longitudinal

### 9.1 Conteúdo

Organizar por:
- avaliação/anamnese;
- demanda;
- objetivos;
- evoluções por sessão;
- procedimentos/intervenções;
- encaminhamentos;
- documentos;
- anexos;
- encerramento.

### 9.2 Leitura segura

- plaintext somente server-side;
- RPC autorizada registra leitura;
- sem cache persistente de plaintext;
- sem exposição a secretary/accounting;
- timeline usa data, sessão e contexto humano, não UUID;
- correção gera nova versão com `supersedes_id`;
- busca clínica deve ocorrer somente em domínio/autorização clínicos e não alimentar busca administrativa global.

## 10. Secretaria ↔ Profissional

### 10.1 Handoff em tempo real operacional

Exemplo:

```text
Secretaria: Paciente chegou
        ↓
Agenda da Profissional: Aguardando atendimento
        ↓
Profissional: Iniciar atendimento
        ↓
Secretaria: Em atendimento
        ↓
Profissional: Finalizar
        ↓
Secretaria: Atendimento concluído + pendências administrativas
```

A Secretaria vê estado operacional, nunca conteúdo da evolução.

### 10.2 Tarefas internas

Criar uma fila simples de tarefas administrativas vinculáveis a paciente/agendamento:
- agendar retorno;
- reenviar formulário;
- entrar em contato;
- confirmar dado cadastral;
- regularizar pagamento;
- tratar NFS-e;
- outra tarefa administrativa.

Campos mínimos:
- tipo;
- paciente/agendamento opcional;
- solicitante;
- responsável;
- prazo;
- status;
- observação administrativa não clínica;
- timestamps.

## 11. Dashboard por perfil

### 11.1 Secretaria

Priorizar:
- agenda do dia;
- confirmações pendentes;
- pacientes aguardando;
- reagendamentos;
- formulários pendentes;
- retornos a agendar;
- pagamentos;
- NFS-e;
- tarefas administrativas.

### 11.2 Profissional

Priorizar:
- atendimentos do dia;
- pacientes aguardando;
- iniciar atendimento;
- evoluções ainda não finalizadas quando permitido;
- documentos/encaminhamentos pendentes;
- retornos solicitados;
- tarefas clínicas próprias.

### 11.3 Administração

Adicionar:
- indicadores financeiros/operacionais autorizados;
- falhas de automação;
- usuários/acessos;
- auditoria;
- configurações.

Dashboard nunca exibe plaintext clínico em cartões administrativos.

## 12. Formulários, documentos e consentimentos

- formulários pré-atendimento associados ao paciente/agendamento;
- status visível na Agenda e ficha;
- envio por capability link existente;
- conteúdo sensível respeita criptografia e segregação;
- assinatura congela versão e evidências;
- documentos ficam acessíveis na ficha conforme autorização;
- secretaria pode saber que um formulário está concluído sem receber conteúdo clínico quando isso não é necessário.

## 13. Financeiro e fiscal

Fluxo deve ser contextual e continuar independente do clínico.

Na ficha/consulta mostrar, conforme permissão:
- valor previsto;
- situação do recebível;
- pagamentos;
- saldo;
- emissão NFS-e;
- falha/pêndencia fiscal;
- ação de registrar pagamento/emitir nota.

Nunca bloquear finalização clínica por indisponibilidade fiscal ou pagamento.

## 14. Comunicação e automações

- confirmação de consulta pela regra já versionada;
- lembretes configurados;
- mensagens de aniversário respeitando preferência;
- envio de formulário/documento;
- histórico administrativo permitido;
- respostas/cancelamentos atualizam estados pela regra existente;
- integrações externas sempre via fila/idempotência/auditoria.

## 15. Segurança, privacidade e auditoria

- RLS default-deny;
- MFA/AAL2 para clínico e administração de permissões críticas;
- dados L3 permanecem segregados;
- nenhuma informação clínica em logs técnicos, dashboard administrativo, relatórios financeiros ou busca global;
- alteração de permissão e leitura clínica geram audit events;
- desativar usuário bloqueia novas sessões/operações;
- serviço privilegiado não substitui autorização de fluxo iniciado por usuário;
- dados sintéticos obrigatórios em testes e homologação.

## 16. Dados e migrations planejadas

Sem alterar migrations históricas. Novas mudanças são forward-only.

Entidades previstas:
- `role_permission_defaults`;
- `user_permission_overrides`;
- extensões administrativas de `people` ou tabelas normalizadas de contato/endereço quando melhor para o schema existente;
- `care_processes`;
- `appointment_series`;
- `schedule_blocks`;
- `staff_tasks`;
- extensões clínicas necessárias para contexto longitudinal sem mover plaintext para schema público.

Decisão de coluna versus tabela separada deve seguir o modelo atual e minimização de dados; não criar JSON genérico quando campos possuem semântica estável.

## 17. Estratégia de entrega

### Onda 0 — Usuários e acessos

Entrega utilizável: administradora consegue gerenciar um usuário e suas permissões; backend/RLS rejeitam ações negadas.

### Onda 1 — Navegação e Paciente 360°

Entrega utilizável: Pacientes aparece no menu, ficha central existe e cadastro completo pode ser criado/editado/relido.

### Onda 2 — Agenda profissional

Entrega utilizável: criar/reagendar/recorrer/bloquear e operar consultas diretamente da agenda.

### Onda 3 — Atendimento e prontuário

Entrega utilizável: iniciar consulta sem IDs, ler histórico autorizado, registrar evolução e finalizar.

### Onda 4 — Colaboração e dashboard

Entrega utilizável: check-in/handoff/tarefas e home adequada a cada perfil.

### Onda 5 — Integração contextual

Entrega utilizável: formulários, documentos, comunicação, financeiro e fiscal aparecem no contexto do paciente/consulta.

### Onda 6 — Homologação e go-live

Entrega utilizável: todos os fluxos passam por testes automatizados, RLS, build, smoke, UI visível e evidência de persistência.

## 18. Definition of Done do programa

Só declarar concluído quando:

1. todos os requisitos P0 possuem implementação e teste;
2. `npm run lint` passa;
3. `npm run typecheck` passa;
4. `npm run test:run` passa;
5. `npm run arch:check` passa;
6. `npm run modules:check` passa;
7. `npm run migrations:check` passa;
8. `npm run seed:check` passa;
9. reset/testes Supabase passam;
10. Playwright E2E passa;
11. `npm run build` passa;
12. CI/DB/governança passam no GitHub;
13. deploy de homologação usa a revisão esperada;
14. Secretaria executa jornada completa pela UI visível;
15. Profissional executa jornada completa pela UI visível;
16. Administradora executa concessão/negação de permissões e as restrições são comprovadas pela UI e backend;
17. conteúdo clínico não vaza para papel sem autorização;
18. dados editados são relidos do banco após refresh/nova navegação;
19. não ficam PRs/branches de tarefa ou Actions falhando/pedentes por abandono;
20. documentação de homologação é atualizada com evidências e resultado final.

## 19. Fora do escopo imediato

Manter no roadmap, mas não bloquear recuperação operacional:
- IA/Scribe;
- teleatendimento nativo;
- fila automática de encaixe;
- portal completo do paciente;
- FHIR/RNDS;
- TISS/TUSS;
- estoque/lotes/prescrição médica;
- microserviços/Kubernetes/blockchain.

Esses itens só entram quando houver necessidade real e nova decisão arquitetural aprovada.
