# Modelo Operacional Multiagente

## Objetivo

Permitir que vários agentes atuem em paralelo sem conflito de contexto, corrupção de regras de negócio ou alterações silenciosas em segurança/fiscal.

## 1. Unidade de trabalho

A unidade mínima é uma **Task Contract** representada por uma GitHub Issue.

Cada task deve declarar:

- problema/objetivo;
- comportamento esperado;
- módulo owner;
- caminhos permitidos;
- caminhos proibidos;
- contratos consumidos;
- contratos produzidos/alterados;
- migrations esperadas;
- testes de aceitação;
- risco: baixo, médio, alto, crítico;
- dependências de outras tasks;
- critérios de rollback.

Tarefas sem contrato claro não devem ser iniciadas.

## 2. Paralelismo seguro

Pode executar em paralelo quando:

- módulos owners são diferentes;
- não alteram o mesmo contrato público;
- não alteram a mesma migration;
- não alteram arquivo de composição compartilhado sem coordenação;
- uma task não depende do output não mergeado da outra.

Não executar em paralelo mudanças concorrentes em:

- `identity`/RLS;
- contratos financeiros centrais;
- modelo de estados de appointments;
- contratos de messaging/fiscal;
- schema compartilhado de `people`;
- arquivos de configuração raiz;
- mesmas migrations.

## 3. Branch e worktree

Formato recomendado:

```text
agent/<issue-number>-<slug>
```

Cada agente usa worktree independente.

Fluxo:

```text
main -> branch/worktree -> implementação -> testes -> PR -> review -> merge
```

Uma task não reutiliza working tree de outra task ativa.

## 4. Papéis de agentes

### Implementer
Executa uma Task Contract específica.

### Domain Reviewer
Verifica regras de negócio, invariantes e contratos.

### Security/RLS Reviewer
Obrigatório para Auth, clinical, capability links, storage e policies.

### Fiscal Reviewer
Obrigatório para NFS-e e efeitos fiscais de pagamento/cancelamento.

### QA Reviewer
Valida testes, bordas, regressão e E2E.

### Architecture Maintainer
Resolve mudanças de contrato, dependência ou ADR.

Um único agente pode exercer mais de um papel em tarefas simples, mas mudanças críticas devem receber revisão independente.

## 5. Níveis de risco

### Baixo
UI sem dado sensível, copy, componentes isolados.

### Médio
CRUD administrativo, relatório não clínico, automação interna.

### Alto
Financeiro, mensageria externa, assinatura, eventos pagos, migrations destrutivas.

### Crítico
RLS/Auth, clinical, NFS-e live, secrets, backup/restore, alteração de política jurídica.

Risco alto/crítico exige checklist adicional e revisão independente.

## 6. Public API de módulo

Cada módulo expõe somente `public.ts`.

Exemplo:

```text
appointments/public.ts
  - scheduleAppointment()
  - cancelAppointment()
  - requestReschedule()
  - AppointmentId
  - AppointmentStatus
  - AppointmentCompleted event
```

Arquivos internos não são contrato.

Quebra de `public.ts` exige:

1. listar consumidores;
2. atualizar testes de contrato;
3. ADR quando semanticamente relevante;
4. migração coordenada dos consumidores.

## 7. Ownership de banco

Cada tabela possui um módulo owner.

Outro módulo não deve escrever diretamente em tabela que não possui.

Leitura cruzada deve preferir:

- query pública do módulo;
- view/read model documentado;
- evento/projeção;
- foreign key apenas quando o acoplamento é intencional e documentado.

## 8. Mudanças em schema

Uma task pode criar migration apenas se ela for owner das tabelas afetadas ou tiver aprovação arquitetural explícita.

Migration deve incluir:

- mudança;
- constraints;
- índices;
- RLS/policies quando aplicável;
- estratégia de dados existentes;
- teste de aplicação em banco limpo;
- teste de upgrade a partir do estado anterior.

## 9. Handoff entre agentes

O PR é o handoff oficial.

A descrição deve possibilitar que outro agente continue sem ler o histórico completo do chat.

Para tarefa interrompida, atualizar a Issue com:

- estado atual;
- branch;
- commits válidos;
- testes verdes/vermelhos;
- decisão pendente;
- próximo passo exato.

## 10. Conflitos

Quando duas tasks precisam do mesmo contrato:

1. não resolver silenciosamente em ambas;
2. escolher um owner da alteração de contrato;
3. criar task pequena para o contrato;
4. mergear contrato primeiro;
5. rebasear tasks consumidoras.

## 11. Não permitir agentes autoreparadores irrestritos

Bots/agentes de manutenção não podem alterar regras de negócio, migrations, RLS ou integrações live automaticamente.

Auto-fix permitido apenas para categorias previamente autorizadas, como:

- formatação;
- dependabot lockfile compatível;
- lint trivial;
- documentação gerada;

sempre via PR e CI.

## 12. Context package de uma task

Ao iniciar, o agente deve carregar apenas:

- `AGENTS.md`;
- `docs/ARCHITECTURE.md`;
- ADRs relacionados;
- README do módulo;
- Task Contract;
- contratos públicos de dependências.

Isso reduz contexto irrelevante e diminui alterações acidentais.

## 13. Regra de parada

O agente deve parar e escalar para Architecture Maintainer se descobrir:

- necessidade de quebrar contrato público;
- necessidade de acessar conteúdo clínico fora do módulo;
- nova interpretação fiscal/jurídica;
- necessidade de bypass de RLS;
- necessidade de alterar representação de dinheiro/data;
- requisito que contradiz ADR vigente;
- dependência circular entre módulos.

## 14. Merge strategy

Preferência: **squash merge** por task, preservando Issue/PR como histórico detalhado.

O commit final deve ser semântico e legível.

## 15. Regra operacional final

**Paralelismo ocorre entre módulos; coordenação ocorre nos contratos; segurança e histórico nunca são resolvidos por convenção informal.**
