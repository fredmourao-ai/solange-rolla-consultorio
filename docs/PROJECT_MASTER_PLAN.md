# Project Master Plan

## Missão

Entregar um sistema privado, simples de usar e auditável para operação de consultório e eventos, sem depender de planilhas paralelas para agenda/financeiro e sem expor dados clínicos a quem não precisa deles.

## Gates do projeto

### Gate A — Arquitetura e governança

Entregáveis:
- arquitetura modular aprovada;
- AGENTS.md;
- boundaries/ADRs;
- Task Contract/PR templates;
- Definition of Done.

Saída: qualquer agente consegue receber uma task isolada e trabalhar sem recuperar a conversa histórica.

### Gate B — Fundação técnica

Entregáveis:
- Next.js/TypeScript;
- Supabase local;
- lint/typecheck/unit/build;
- CI GitHub;
- staging;
- ruleset de `main` ativado depois que os checks existirem.

### Gate C — Identity + People

Entregáveis:
- staff auth/MFA;
- roles/RLS;
- cadastro Pessoa;
- dados fiscais, contato, nascimento, responsável;
- testes de autorização.

### Gate D — Agenda

Entregáveis:
- consultas;
- recorrência;
- agenda dia/semana/mês;
- máquina de estados;
- política de 48h excluindo sábado/domingo;
- deadline persistido/versionado.

### Gate E — Formulário + assinatura

Entregáveis:
- template versionado;
- capability link;
- salvar/continuar;
- assinatura simples;
- documento congelado + SHA-256 + PDF + evidência;
- privacidade/UX idoso.

### Gate F — Comunicação

Entregáveis:
- filas;
- WhatsApp/e-mail por adaptadores;
- confirmação 24h antes;
- confirmar/reagendar/cancelar;
- secretaria recebe tarefa de reagendamento;
- retry/idempotência/inbox de webhook.

### Gate G — Financeiro

Entregáveis:
- contas a receber;
- pagamentos integrais/parciais/múltiplas formas;
- falta/cancelamento com cobrança configurável;
- isenção auditada;
- contas a pagar/recorrência;
- fluxo realizado/projetado.

### Gate H — Eventos

Entregáveis:
- agenda de eventos;
- inscrições e lista de espera;
- cadastro Pessoa reutilizado;
- presença;
- financeiro e despesas por evento;
- formulário/assinatura opcional.

### Gate I — Fiscal

Entregáveis:
- NfseProvider;
- homologação/produção restrita;
- emissão/consulta/cancelamento;
- PDF/XML privado;
- feature flag live;
- regra do prestador validada com contabilidade.

### Gate J — Clinical

Entregáveis:
- registro psicológico;
- storage clínico;
- AAL2 + role + RLS;
- auditoria de leitura/escrita;
- testes negativos.

### Gate K — Automação e relatórios

Entregáveis:
- aniversários;
- dashboard "Atenção hoje";
- pendências de formulário, pagamento, NFS-e, confirmação e reagendamento;
- relatórios e exportação segura.

Estado em 27/08/2026: contratos de dashboard, relatórios financeiros,
agenda/eventos/fiscal, CSV/XLSX/PDF e observabilidade sanitizada estão
implementados. Fixtures E2E sintéticas e runbooks de restore/privacidade estão
versionados. O checklist de produção permanece `NO-GO` até os gates externos e
as validações finais descritas em `docs/operations/GO_LIVE_CHECKLIST.md`.

### Gate L — Go-live

Pré-condições:
- revisão jurídica dos textos/termos;
- entidade fiscal e parâmetros confirmados;
- WhatsApp/email aprovados;
- backup/restore testados;
- staging homologado pela profissional;
- security/RLS suite verde;
- runbooks operacionais;
- produção sem dados seed.

O release candidate deve usar o template em
`docs/releases/RELEASE_CANDIDATE_TEMPLATE.md`; ausência de formulário real
homologado, credenciais fiscais/WhatsApp/e-mail, restore medido ou revisão
jurídica mantém a decisão `NO-GO`.

## Ordem de execução

Não iniciar Fiscal live, Clinical ou integrações externas antes de Identity/RLS, Audit e filas estarem estáveis.

Financeiro básico deve existir antes do Fiscal live.

Cadastro Pessoa precede Agenda e Eventos para evitar modelos duplicados.

## Estratégia de entrega

Cada Gate é quebrado em Task Contracts pequenos. Uma task = uma branch/worktree = um PR.

Cada Gate termina com smoke/E2E do fluxo que passou a existir.

## Critério final do MVP

### Consulta
Pessoa -> agenda -> formulário -> assinatura -> confirmação -> atendimento -> pagamento -> NFS-e.

### Evento
Evento -> inscrição -> pessoa -> pagamento -> presença -> NFS-e -> resultado.

### Administração
Contas a pagar + fluxo de caixa + pendências + aniversários.

### Segurança
Secretaria/contabilidade não conseguem acessar dados clínicos nem por UI nem por API direta.
