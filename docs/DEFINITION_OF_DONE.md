# Definition of Done

Uma tarefa só pode ser considerada concluída quando todos os itens aplicáveis abaixo estiverem atendidos.

## 1. Escopo

- [ ] Task Contract/Issue possui objetivo e critérios de aceitação.
- [ ] Mudança ficou dentro dos caminhos permitidos ou desvios foram justificados.
- [ ] Não houve refactor não relacionado.
- [ ] Não existem TODOs vagos ou placeholders introduzidos.

## 2. Código

- [ ] Código segue limites de módulo e importa outros módulos apenas por API pública.
- [ ] Regra de negócio relevante está no domínio/application, não escondida na UI.
- [ ] Não existe duplicação evitável de regra crítica.
- [ ] Erros esperados possuem comportamento explícito.
- [ ] Operações externas possuem timeout e tratamento de falha.

## 3. Banco

- [ ] Mudança de schema possui migration nova.
- [ ] Migration anterior não foi reescrita.
- [ ] Constraints e foreign keys aplicáveis existem.
- [ ] Índices necessários foram considerados/testados.
- [ ] RLS está habilitado em tabela exposta.
- [ ] Policies seguem default-deny.
- [ ] Migração aplica em banco limpo.
- [ ] Upgrade a partir da versão anterior foi testado quando aplicável.

## 4. Segurança e privacidade

- [ ] Nenhum secret foi commitado.
- [ ] Nenhum dado real de paciente foi usado.
- [ ] Logs não contêm PII sensível desnecessária.
- [ ] Conteúdo clínico não atravessa fronteira indevida.
- [ ] Authorization tests cobrem acesso permitido e negado.
- [ ] Links públicos usam escopo/expiração/revogação adequados.
- [ ] `service_role` não foi usado para contornar autorização interativa.

## 5. Financeiro/fiscal

Quando aplicável:

- [ ] Valores monetários não usam float.
- [ ] Alterações preservam histórico financeiro.
- [ ] Operação é idempotente quando pode ser repetida.
- [ ] Estado financeiro não foi acoplado indevidamente ao estado da agenda.
- [ ] Integração fiscal está em mock/sandbox por padrão.
- [ ] Feature flag impede operação live acidental.

## 6. Assíncrono e integrações

Quando aplicável:

- [ ] Job pode ser reexecutado sem duplicar efeito.
- [ ] Idempotency key está definida.
- [ ] Retry/backoff está definido.
- [ ] Falha terminal fica visível operacionalmente.
- [ ] Webhook possui deduplicação por provider event id.
- [ ] Nenhuma chamada externa crítica bloqueia transação principal sem necessidade.

## 7. Testes

- [ ] Unit tests passam.
- [ ] Typecheck passa.
- [ ] Lint passa.
- [ ] Integration tests aplicáveis passam.
- [ ] RLS/security tests aplicáveis passam.
- [ ] Contract tests aplicáveis passam.
- [ ] Playwright smoke/E2E aplicável passa.
- [ ] Bugfix possui teste de regressão.
- [ ] Casos de borda relevantes foram cobertos.
- [ ] Mudança que lê/edita persistência foi exercitada contra ao menos um **registro pré-existente** de cada classe material encontrada: atual, legado, migrado/backfill, parcial/null-edge e versionado, quando aplicável.
- [ ] Fluxo mutável operado pela UI foi salvo e depois foi necessário **recarregar/reabrir** a tela para confirmar persistência, audit/history e efeitos dependentes.
- [ ] Bug de compatibilidade histórica possui fixture/regressão que reproduz a forma persistida antiga; cast de tipo não substitui a prova.

## 8. Documentação

- [ ] README do módulo foi atualizado se contrato/invariante mudou.
- [ ] ADR foi criado/atualizado para decisão arquitetural.
- [ ] `.env.example` foi atualizado se houve nova configuração.
- [ ] Operação/runbook foi atualizado se houve nova rotina operacional.
- [ ] PR descreve migrations, riscos, testes e rollback.

## 9. Observabilidade e auditoria

- [ ] Operação crítica possui audit event quando necessário.
- [ ] Correlation/request id é propagado quando aplicável.
- [ ] Métricas/logs permitem identificar falha sem revelar dado clínico.
- [ ] Ação de alto impacto possui ator e timestamp rastreáveis.

## 10. CI e revisão

- [ ] Todos os checks obrigatórios do PR estão verdes.
- [ ] Review exigido foi concluído.
- [ ] Comentários críticos foram resolvidos.
- [ ] Branch está apta a merge sem conflito.
- [ ] Nenhuma exceção de segurança ficou sem registro explícito.

## 11. Pós-merge

Quando aplicável:

- [ ] Migration foi observada no ambiente alvo.
- [ ] Smoke test pós-deploy passou.
- [ ] Jobs/filas/webhooks estão saudáveis.
- [ ] Não houve crescimento anormal de erro/log/fila.

## Regra final

**“Compila” não significa “pronto”. Pronto significa correto, testado, autorizado, auditável, documentado e operável.**
## Hardening final

Fluxos administrativos devem ter teste de autorização negativo, acessibilidade
axe sem violações `critical`/`serious`, teste mobile com zoom de 200% e budget
de performance registrado. Testes que dependem de provider live usam sandbox;
nenhuma credencial ou dado real é necessário para passar o CI.
