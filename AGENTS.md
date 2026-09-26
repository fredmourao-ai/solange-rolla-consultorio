# AGENTS.md — Regras obrigatórias para agentes

<!-- GLOBAL_BROWSER_VM_POLICY_V2 -->
> **NAVEGAÇÃO GLOBAL — VM OBRIGATÓRIA; WINDOWS PROIBIDO PARA BROWSER:** qualquer navegador, automação browser, sessão gráfica, Playwright/Selenium/CDP, Chrome/Chromium/Edge/Opera, CAPTCHA, MFA, consentimento ou validação visual deve usar por padrão e obrigatoriamente a VM backend `always-free-arm-1787907847-26` (`10.0.1.38`) e o Browser Worker privado. Para intervenção humana, usar `https://shopvivaliz.com.br/admin/browser-worker.php`. **Fred-Win (`LAPTOP-NIG4IFUU`) e `DESKTOP-KOCEPSV` não são destinos nem fallback para navegação.** Não perguntar qual máquina usar para browser: use a VM. Exceção somente se o proprietário ordenar explicitamente, na tarefa atual, o uso de um Windows específico para aquela navegação. Se a VM estiver indisponível, reparar o caminho VM/OCI Bastion/túnel privado ou registrar bloqueio real; nunca migrar silenciosamente para Windows. Workflows/relays Windows de browser são legado e não devem ser executados até serem migrados. A regra não proíbe Windows para tarefas não-browser que realmente dependam dele.

<!-- GLOBAL_BROWSER_SESSION_PROFILE_V1 -->
> **SESSAO CANONICA OPENAI/CHATGPT NA VM:** para qualquer navegacao em ChatGPT/OpenAI no Browser Worker, reutilize o contexto persistente existente com `persistent=true` e `profile=ai-squad-chatgpt`. Esse e o perfil canonico que deve preservar a autenticacao ja realizada. Nao criar perfil novo, nao usar `manual` como fallback e nao migrar para Fred-Win/KOCEPSV. Se a autenticacao expirar ou exigir MFA/CAPTCHA, abra **esse mesmo perfil** pela interface autenticada `https://shopvivaliz.com.br/admin/browser-worker.php`, conclua a autenticacao nele e continue reutilizando `ai-squad-chatgpt`. Labels/TTL de sessoes de trabalho podem variar, mas o profile para ChatGPT/OpenAI deve permanecer `ai-squad-chatgpt`, salvo ordem explicita do proprietario na tarefa atual.



<!-- SUPERPOWERS_EVERY_STAGE_V1 -->
> **@Superpowers CONTÍNUO E OBRIGATÓRIO:** toda conversa, sessão, agente e retomada de tarefa destes projetos deve usar @Superpowers **em cada etapa material**, não apenas no início. Reaplique a disciplina adequada ao passar por bootstrap/contexto, planejamento, investigação, coleta de evidências, implementação, debugging, TDD/testes, revisão, correção, PR/checks/merge, deploy, pós-deploy, auditoria e encerramento. Em `retome/continue/prossiga`, continue do último checkpoint comprovado sob @Superpowers. Se o runtime não expuser @Superpowers, registre `SUPERPOWERS_UNAVAILABLE` e aplique a metodologia equivalente sem fingir a chamada. Subagentes e automações delegadas herdam esta obrigação. Fonte local: `REGRAS-AGENTES-CENTRALIZADAS.md`; fonte canônica global: `Vivaliz-site/site-shopvivaliz`.

Este arquivo é a primeira leitura obrigatória de qualquer agente humano ou automatizado que trabalhar neste repositório.

## Acesso a infraestrutura e VMs

Antes de executar qualquer comando em VM Oracle Cloud, leia e siga obrigatoriamente [`AGENTS-VM-ACCESS.md`](AGENTS-VM-ACCESS.md). O runbook define as duas VMs atuais, o helper OCI `sv-oci-vm-run`, o SSH administrativo validado, a ordem de fallback e as regras para não expor secrets. Nunca presuma root no OCI Run Command.

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

## 18. Estado de reports e release

- `reports` consome somente contratos públicos/read models administrativos,
  financeiros e fiscais; nunca importa `clinical` ou conteúdo clínico.
- Dashboard e relatórios usam centavos inteiros e exportações não incluem
  respostas, envelopes, anexos clínicos, secrets ou payload bruto de provider.
- Logs técnicos passam por redaction e usam correlation IDs opacos; health não
  expõe URLs, tokens ou dados pessoais.
- `docs/operations/GO_LIVE_CHECKLIST.md` é `NO-GO` por padrão. CI/E2E, restore,
  revisão jurídica, formulário real, dados fiscais e credenciais externas
  precisam de evidência antes de produção.
- Runbooks de backup/restore, incidente, rollback, privacidade e retenção são
  parte do estado operacional e devem ser atualizados junto do release.

## 18. Isolamento de ambientes

- `APP_ENV` aceita somente `local`, `test`, `preview`, `staging` e `production`.
- Local, CI e preview usam exclusivamente dados sintéticos verificados por `npm run seed:check`.
- Production nunca é usada para desenvolvimento, preview ou teste.
- Preview exige projeto/branch Supabase dedicado; staging é compartilhado e serializado.
- Promoção para staging ocorre pelo workflow canônico, com `concurrency: staging`, commit SHA explícito e migrations forward-only; após CI verde em `main`, a promoção pode ser disparada automaticamente pelo gate aprovado.
- Providers live permanecem desativados fora de production.

## 19. Política obrigatória de consumo de IA e execução recorrente

- Claude, GPT/OpenAI e Codex pagos são permitidos somente em tarefas finitas, com objetivo concreto, e devem encerrar ao concluir ou atingir bloqueio real.
- É proibido usar IA paga em daemon, service loop, cron/timer periódico, watcher, autorepair, supervisor, polling ou retry sem limite.
- Rotinas permanentes/periódicas devem ser determinísticas. Se IA for indispensável, usar opção gratuita/local aprovada, com limite de chamadas e sem fallback silencioso para provedor pago.
- Toda tarefa finita com IA paga deve ter circuit breaker: timeout, limite de retries/chamadas/contexto, condição de saída e checkpoint quando necessário. Ao atingir limite, encerrar em vez de relançar automaticamente.
- Antes de habilitar ou manter automação, auditar consumidor por consumidor: necessidade real, host, gatilho, frequência, provedor/modelo, custo, timeout, retries, limite de chamadas, condição de saída e duplicidade/orfandade.
- Processo travado, órfão ou sem progresso deve ser encerrado e ter a causa raiz investigada; reinício infinito é proibido.
- Workflows GitHub com IA paga devem exigir gatilho explícito/restrito. Eventos genéricos, comentários de bots, pushes ou `schedule` não podem disparar Claude/GPT/Codex automaticamente.
- Fallback de automação deve seguir: determinístico → IA local/gratuita → paid somente em tarefa finita explicitamente autorizada. Para rotinas recorrentes a cadeia termina antes do provedor pago.
- Teste de credencial não deve consumir modelo pago quando validação de configuração/formato for suficiente.
- Registrar sem secrets início/fim, gatilho, provedor/modelo, tentativas, duração e resultado de qualquer consumidor de IA.

## 20. Política obrigatória de PR, gate, merge e bloqueios

- Toda tarefa finalizada deve terminar em PR validado e merge; não deixar PR pronta aberta sem motivo técnico comprovado.
- Se qualquer check, lint, teste, gate, conflito ou Action falhar: investigar causa raiz, corrigir, revalidar e repetir até ficar verde. É proibido contornar falha com bypass, `|| true`, `exit 0`, force merge ou desativação de proteção.
- Gate verde não autoriza merge por si só. Merge automático só pode ocorrer para PR do próprio repositório, com todos os checks canônicos aplicáveis verdes e confirmação humana explícita persistida para o HEAD exato como comentário `HUMAN_MERGE_APPROVED_SHA:<HEAD_SHA>` feito pelo owner. Qualquer mudança de HEAD invalida a aprovação anterior.
- Bloqueio aparentemente externo não encerra a tarefa. Investigar solução segura em configuração, credencial, permissão, serviço, ambiente, provider ou infraestrutura antes de classificar como inconclusivo.
- Depois do merge, verificar os Actions do SHA resultante. Promoção automática de staging só pode ocorrer quando o HEAD da PR tiver confirmação humana explícita persistida como `HUMAN_STAGING_APPROVED_HEAD:<HEAD_SHA>` e o opt-in do repositório estiver ativo; sem isso, staging aguarda promoção explicitamente autorizada. Produção continua sujeita aos gates de ambiente e às proteções clínicas/fiscais vigentes.
- Nunca automatizar aprovação que reduza RLS, MFA/AAL2, isolamento de ambiente, proteção de dados clínicos, idempotência financeira/fiscal ou feature flags live.

## Isolamento obrigatorio de sessao CLI por chat

Antes de qualquer operacao em terminal/CLI, leia e cumpra a secao `Isolamento obrigatorio de sessao CLI por chat` de `AI-TO-CLI-PROTOCOL.md`. Cada chat deve usar sessao/namespace CLI exclusivo; reutilizacao de sessao entre chats e proibida. Estado necessario para retomada deve ser persistido fora da memoria do shell.
Regra de continuidade: leia e cumpra `AI-TO-CLI-PROTOCOL.md`, especialmente `Continuidade obrigatoria diante de falha de ferramenta ou comando`; erro de ferramenta nao autoriza encerrar a tarefa.

## Continuidade obrigatoria
Todo agente deve cumprir o `PROTOCOLO OBRIGATORIO DE CONCLUSAO DE TAREFAS` em `AI-TO-CLI-PROTOCOL.md`; erro de ferramenta ou resultado parcial nunca e motivo para parar.


<!-- AUDIT_ABSOLUTE_V5_ENTRYPOINT -->
## Auditoria Extrema V5 absoluta — entrada obrigatória
Antes de qualquer auditoria completa/extrema, validação de release ou declaração de aptidão, leia e execute integralmente `AUDIT_POLICY.md`, `docs/quality/AUDIT_ABSOLUTE_GATE_V1.md`, `docs/quality/AUDIT_BROWSER_E2E_REAL_V1.md`, `docs/quality/AUDIT_APTO_REMEDIATION_LOOP_V1.md`, `docs/quality/AUDIT_AUTH_CREDENTIAL_DISCOVERY_V1.md`, `docs/quality/AUDIT_PROJECT_REQUIREMENTS_V1.md` e `docs/quality/AUDIT_PROJECT_REQUIREMENTS.json`.
Se existir UI, o próprio agente executa E2E real no navegador gráfico no mesmo release. API/CLI/headless-only não certificam. Todo bloqueador executável deve ser corrigido, testado, deployado quando aplicável e reauditado até o certifier retornar `AUDIT_VERDICT=APTO`. Antes de declarar bloqueio por login/credencial, esgote a descoberta segura em todos os repositórios governados e fontes canônicas sem expor secrets.


<!-- AUDIT_MERGE_ENFORCEMENT_V1 -->
## Enforcement absoluto de merge/main
Para auditoria/aptidão, cumpra `docs/quality/AUDIT_MERGE_ENFORCEMENT_V1.md`. O gate local deve executar `scripts/absolute-audit-governance-validate.sh`, e todo push em `main`/`master` deve passar pelo **Absolute Audit Main Guard** com prova de PR mesclado.
