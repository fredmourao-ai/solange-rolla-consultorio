# AGENTS.md — Regras obrigatórias para agentes

Este arquivo é a primeira leitura obrigatória de qualquer agente humano ou automatizado que trabalhar neste repositório.

## 1. Ordem de leitura

Antes de alterar código:

1. `README.md`
2. `AGENTS.md`
3. `docs/ARCHITECTURE.md`
4. `docs/AGENT_OPERATING_MODEL.md`
5. `docs/DEFINITION_OF_DONE.md`
6. README do módulo afetado
7. ADRs relacionados em `docs/adr/`
8. Issue/Task Contract da tarefa

Se houver conflito, a ordem de autoridade é:

`ADR vigente > ARCHITECTURE.md > AGENTS.md > módulo README > issue > implementação existente`.

## 2. Regras não negociáveis

- Não escrever diretamente em `main`.
- Uma tarefa deve usar branch/worktree próprio.
- Uma tarefa deve resultar em um PR focado.
- Não alterar arquivos fora do escopo declarado sem justificar no PR.
- Não modificar migration já aplicada; criar nova migration corretiva.
- Não inserir secrets no repositório, issue, PR, log ou teste.
- Não usar dados reais de pacientes em desenvolvimento ou teste.
- Não logar CPF completo, respostas de formulário ou conteúdo clínico.
- Não expor conteúdo clínico por WhatsApp/e-mail.
- Não usar `service_role` para operações interativas de usuários.
- Não contornar RLS por conveniência.
- Não remover auditoria, idempotência ou validações críticas.
- Não misturar status de agenda, financeiro e fiscal.
- Não recalcular regras históricas quando uma política futura mudar.
- Não usar float para dinheiro.
- Não criar integração live sem feature flag e homologação.

## 3. Limites entre módulos

Um módulo só pode consumir outro por:

- `public.ts`;
- contratos/tipos públicos documentados;
- IDs persistidos;
- eventos assíncronos documentados.

É proibido importar arquivos internos de outro módulo, especialmente `infrastructure/`.

Se uma nova dependência cruzada parecer necessária, pare e proponha alteração arquitetural/ADR.

## 4. Dados clínicos

O módulo `clinical` é zona de segurança elevada.

Somente `psychologist_owner` com MFA/AAL2 pode ler ou escrever conteúdo clínico.

Secretaria e contabilidade nunca recebem conteúdo clínico, inclusive por API, relatório, exportação, busca ou log.

Mudanças em RLS clínico exigem:

- teste positivo para psicóloga;
- teste negativo para secretaria;
- teste negativo para contabilidade;
- teste negativo para anônimo;
- revisão específica de segurança.

## 5. Financeiro

- Valores monetários: centavos inteiros.
- Percentuais: `numeric` com escala explícita.
- Pagamento não altera status de consulta automaticamente sem caso de uso explícito.
- Isenção exige justificativa e auditoria.
- Estornos e cancelamentos mantêm histórico.
- Nenhum registro financeiro relevante deve ser apagado fisicamente.

## 6. Agenda e política de cancelamento

Política inicial:

- 48 horas computáveis;
- sábado e domingo não contam;
- timezone de negócio `America/Sao_Paulo`;
- `policy_version` e deadline calculado devem ser persistidos.

Mudança de política só afeta novos registros conforme regra explícita; não alterar históricos silenciosamente.

## 7. Formulários e assinatura

- template é versionado;
- resposta assinada é imutável;
- qualquer correção gera nova versão;
- hash SHA-256 identifica o conteúdo congelado;
- link público usa capability token com escopo mínimo;
- token bruto nunca é persistido nem logado;
- conteúdo clínico não é enviado a terceiro sem decisão arquitetural e jurídica explícita.

## 8. Integrações externas

WhatsApp, e-mail, NFS-e e geração pesada de documentos devem passar por fila/worker quando a operação puder falhar ou ser repetida.

Todo consumidor externo precisa de:

- idempotency key;
- retry controlado;
- timeout;
- registro sanitizado de tentativa;
- estado de falha operacional visível;
- mock/sandbox para testes.

Webhooks entram por `inbox_events` com `provider_event_id` único antes do processamento.

## 9. Cron

Cron identifica trabalho e enfileira jobs. Não executar envio externo pesado diretamente no cron.

Jobs precisam ser seguros para reexecução.

## 10. Logs e auditoria

Log técnico e audit log são conceitos diferentes.

### Log técnico pode conter

- correlation/request id;
- entity UUID;
- código de erro;
- duração;
- provider status sanitizado.

### Log técnico não pode conter

- CPF completo;
- nome + diagnóstico/contexto clínico;
- respostas de formulário;
- tokens;
- secrets;
- XML fiscal bruto com PII.

Audit log registra ações relevantes de usuário/sistema e não pode depender de `console.log`.

## 11. Banco e migrations

- SQL é fonte de verdade do schema.
- RLS é obrigatório nas tabelas expostas.
- Foreign keys explícitas.
- Mudanças destrutivas exigem plano de migração e rollback/restore.
- Seed usa apenas pessoas e documentos fictícios.
- Produção nunca é usada para testes.

## 12. Testes mínimos por tipo de mudança

### Regra de domínio
Unit tests de casos normais e bordas.

### Banco/RLS
Integration + authorization matrix.

### Integração
Contract tests + idempotência + retry.

### Fluxo crítico
Playwright E2E.

### Correção de bug
Primeiro criar teste que reproduz o bug; depois corrigir.

## 13. Segurança de dependências

Antes de adicionar uma biblioteca:

- justificar por que código nativo não basta;
- verificar manutenção/licença;
- evitar pacote que duplique recurso já fornecido pela plataforma;
- pin/lockfile obrigatório;
- nenhuma dependência para uma função trivial.

## 14. Alterações arquiteturais

Criar/atualizar ADR antes de:

- mudar modelo de autorização;
- mudar fonte de verdade;
- introduzir serviço externo estrutural;
- quebrar contrato público de módulo;
- mudar política histórica;
- extrair microserviço;
- introduzir nova fila/broker;
- mudar representação monetária ou temporal.

## 15. Handoff obrigatório no PR

Todo PR deve informar:

- objetivo;
- escopo;
- arquivos principais;
- migrations;
- contratos alterados;
- variáveis de ambiente novas;
- testes executados;
- impacto em segurança/privacidade;
- impacto em financeiro/fiscal;
- riscos conhecidos;
- passos de rollback quando aplicável.

## 16. Definition of Done

Nenhum agente pode declarar tarefa concluída antes de cumprir `docs/DEFINITION_OF_DONE.md` e apresentar evidência de execução dos checks aplicáveis.

## 17. Regra de ouro

**Se uma mudança facilita o código mas reduz segurança, auditabilidade, isolamento de módulo ou clareza histórica, a mudança está errada.**
