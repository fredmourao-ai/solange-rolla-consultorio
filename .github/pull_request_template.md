## Objetivo

Descreva em uma frase o resultado entregue por este PR.

## Task Contract

- Issue:
- Módulo owner:
- Risco: baixo / médio / alto / crítico

## Escopo

### Arquivos/módulos alterados
- 

### Fora de escopo
- 

## Contratos

- Contratos públicos consumidos:
- Contratos públicos alterados/criados:
- ADR relacionado (se aplicável):

## Banco

- [ ] Sem mudança de schema
- [ ] Migration nova incluída
- [ ] RLS/policies revisadas
- [ ] Upgrade testado

Migration(s):

## Segurança e privacidade

- [ ] Não usa dados reais de pacientes
- [ ] Não adiciona PII sensível em logs
- [ ] Não contorna RLS
- [ ] Conteúdo clínico permanece segregado
- [ ] Links/tokens seguem escopo mínimo

Impacto de segurança/privacidade:

## Financeiro/fiscal

- [ ] Não aplicável
- [ ] Valores monetários sem float
- [ ] Histórico preservado
- [ ] Idempotência revisada
- [ ] Sandbox/feature flag fiscal mantidos

## Testes executados

```text
lint:
typecheck:
unit:
integration:
RLS/security:
contract:
E2E:
build:
```

## Evidências

Inclua resultados relevantes, screenshots sem dados reais ou referências aos checks de CI.

## Rollback

Explique como reverter com segurança, especialmente migrations e integrações.

## Handoff

- Novas variáveis de ambiente:
- Novas filas/jobs/webhooks:
- Riscos conhecidos:
- Próxima dependência/tarefa:

## Definition of Done

- [ ] `docs/DEFINITION_OF_DONE.md` revisado e itens aplicáveis cumpridos
