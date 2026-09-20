# AGENTS.md — Regras obrigatórias para agentes

<!-- GLOBAL_BROWSER_VM_POLICY_V2 -->
> **NAVEGAÇÃO GLOBAL — VM OBRIGATÓRIA; WINDOWS PROIBIDO PARA BROWSER:** qualquer navegador, automação browser, sessão gráfica, Playwright/Selenium/CDP, Chrome/Chromium/Edge/Opera, CAPTCHA, MFA, consentimento ou validação visual deve usar por padrão e obrigatoriamente a VM backend `always-free-arm-1787907847-26` (`10.0.1.38`) e o Browser Worker privado. Para intervenção humana, usar `https://shopvivaliz.com.br/admin/browser-worker.php`. **Fred-Win (`LAPTOP-NIG4IFUU`) e `DESKTOP-KOCEPSV` não são destinos nem fallback para navegação.** Não perguntar qual máquina usar para browser: use a VM. Exceção somente se o proprietário ordenar explicitamente, na tarefa atual, o uso de um Windows específico para aquela navegação. Se a VM estiver indisponível, reparar o caminho VM/OCI Bastion/túnel privado ou registrar bloqueio real; nunca migrar silenciosamente para Windows. Workflows/relays Windows de browser são legado e não devem ser executados até serem migrados. A regra não proíbe Windows para tarefas não-browser que realmente dependam dele.

<!-- FINAL_RESPONSE_DEPLOY_GATE_V1 -->
> **CONCLUSAO GLOBAL — MERGE NAO ENCERRA A TAREFA:** toda alteracao versionada deve seguir ate branch -> validacao -> PR -> checks -> merge e, quando o repositorio tiver alvo de deploy/runtime, deploy pelo gate canonico + validacao pos-deploy real. PR aberta, checks verdes ou merge isoladamente sao estados intermediarios. Antes de responder CONCLUIDO, o agente deve provar que o ramo alvo e o runtime/deploy aplicavel estao na revisao esperada e que nao restou PR da propria rodada. Se o deploy automatico pular, falhar ou ficar atrasado, o agente deve acionar o gate canonico e continuar ate paridade; so um bloqueio externo real e incontornavel permite encerrar como BLOQUEIO EXTERNO/INCONCLUSIVO.



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
- Gate verde autoriza merge automático somente para PR do próprio repositório e depois de todos os checks canônicos aplicáveis passarem.
- Bloqueio aparentemente externo não encerra a tarefa. Investigar solução segura em configuração, credencial, permissão, serviço, ambiente, provider ou infraestrutura antes de classificar como inconclusivo.
- Depois do merge, verificar os Actions do SHA resultante. CI verde em `main` deve acionar automaticamente a promoção canônica de staging; produção continua sujeita aos gates de ambiente e às proteções clínicas/fiscais vigentes.
- Nunca automatizar aprovação que reduza RLS, MFA/AAL2, isolamento de ambiente, proteção de dados clínicos, idempotência financeira/fiscal ou feature flags live.

## Isolamento obrigatorio de sessao CLI por chat

Antes de qualquer operacao em terminal/CLI, leia e cumpra a secao `Isolamento obrigatorio de sessao CLI por chat` de `AI-TO-CLI-PROTOCOL.md`. Cada chat deve usar sessao/namespace CLI exclusivo; reutilizacao de sessao entre chats e proibida. Estado necessario para retomada deve ser persistido fora da memoria do shell.
Regra de continuidade: leia e cumpra `AI-TO-CLI-PROTOCOL.md`, especialmente `Continuidade obrigatoria diante de falha de ferramenta ou comando`; erro de ferramenta nao autoriza encerrar a tarefa.

## Continuidade obrigatoria
Todo agente deve cumprir o `PROTOCOLO OBRIGATORIO DE CONCLUSAO DE TAREFAS` em `AI-TO-CLI-PROTOCOL.md`; erro de ferramenta ou resultado parcial nunca e motivo para parar.
