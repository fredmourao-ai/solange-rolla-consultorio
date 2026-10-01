# Estado da Auditoria

**Status:** NÃO APTO

Auditoria de governança/meta-auditoria executada sobre as próprias diretrizes de auditoria (`AUDIT_POLICY.md`, `EXTREME_AUDIT_PROTOCOL.md`, `AUDIT_RUNTIME_PARITY_V1.md`, `AUDIT_OVERLAY.md`) e sobre o estado local do código, a partir de uma sessão remota sem acesso a VM/homologação/staging/produção. Esta rodada **não substitui** a auditoria operacional completa (UI real, staging, produção, backups) exigida pelo protocolo — ela documenta explicitamente o que foi comprovado localmente e o que permanece dívida de evidência.

## Achado de governança (P0, corrigido nesta rodada)
**COMPROVADO — mesma classe de falha já registrada em 2026-09-17.** A entrada anterior deste ledger cobria o SHA `eff6220ea0ed530bfae48395a7da894a5cdf6f6c` (2026-09-17) e não foi atualizada apesar de **22 commits materiais** terem entrado em `main` desde então (PRs #181 a #256), incluindo mudanças em área clínica (`fix(clinical): audit record writes atomically`, #205), segurança/dependências (`security(deps): remediate npm audit high findings`, #251; `security(deps): update Next.js to 16.3.8`, #253), backup/restore (`fix(backup): restore dump into empty public schema`, #182), paridade de runtime publicado (`fix(audit): enforce published runtime parity`, #195) e a própria governança de auditoria (`audit: propagate absolute Extreme Audit V5`, #237; `audit: sync V5 merge enforcement and main guard`, #238). Pela própria regra de `AUDIT_POLICY.md` ("mudança material posterior invalida a cobertura correspondente"), o veredito de 2026-09-17 já estava formalmente inválido antes desta rodada.

Causa raiz: a recomendação já registrada na rodada anterior (check de CI que bloqueie merge de escopo crítico sem atualização correspondente deste ledger) não foi implementada entre #181 e #256. Continua sem gate mecânico. Reafirmado como pendência sistêmica.

## Última auditoria válida (evidência local)
- Data: 2026-10-01
- Commit/SHA auditado: `2fe46991...` (`origin/main`, HEAD no momento desta rodada)
- Release/ambiente comprovado: apenas árvore local, nesta sessão. **Nenhuma evidência de homologação/produção foi reproduzida nesta rodada** — a sessão que a executou não tem rota de rede para a VM de homologação/staging (apenas HTTPS a hosts allowlisted; confirmado nas rodadas anteriores desta mesma classe de sessão).
- Veredito: **NÃO APTO PARA PRODUÇÃO** (herdado; nada nesta rodada eleva o veredito, pois os itens NÃO VALIDADO abaixo continuam sem prova)
- Confiança do veredito quanto ao código local: **alta** para a evidência listada abaixo; **inalterada (dívida de evidência)** para tudo que depende de staging/produção/VM/Docker.

## Evidência reproduzida no SHA `2fe4699...` (local, sem Docker/Supabase/staging)
- `npm install`: PASS, mesmo aviso de `engines` já conhecido (`node` esperado `24.19.0`, ambiente usou `22.22.2`); `npm audit`: **0 vulnerabilidades** (consistente com #251/#253, mesclados desde a rodada anterior).
- `npm run typecheck`: PASS.
- `npm run lint`: PASS, 0 erros, 2 warnings não bloqueantes — mesmos já conhecidos (`window.location.assign` em `login-form.tsx` e `session-controls.tsx`), ainda não corrigidos desde 2026-09-17.
- `npm run arch:check`: PASS, 483 módulos / 1081 dependências, sem violações.
- `npm run modules:check`: PASS.
- `npm run migrations:check`: PASS.
- `npm run test:run`: **677 PASS / 1 SKIP** (208 arquivos PASS / 1 arquivo SKIP). Os dois stack traces impressos durante a execução, de `scripts/preview-env.mjs` e `scripts/staging-lock.mjs`, continuam sendo comportamento esperado de scripts de guarda sendo exercitados por teste, não falha.
- `npm run build`: PASS (build de produção Next.js/Turbopack, as 19 rotas geradas sem erro).
- `bash scripts/absolute-audit-governance-validate.sh`: **PASS** — todos os `GLOBAL_BLOB`/`GLOBAL_ENTRYPOINT` do manifesto de governança absoluta presentes e íntegros; `GLOBAL_AUDIT_POLICY=PASS version=2026-09-21-absolute-v5`; `ABSOLUTE_AUDIT_GOVERNANCE_BRIDGE=PASS`.

## Não executado nesta rodada — permanece **NÃO VALIDADO**
- `npm run supabase:reset` / `npm run supabase:test` (pgTAP/RLS): não executado — sem Docker/Supabase disponível nesta sessão.
- `npm run test:e2e` (Playwright) e qualquer homologação por UI real: não executado — sem browser contra ambiente publicado nesta sessão.
- Paridade SHA candidato × SHA servido em homologação/produção (`/api/health.buildSha`): não reverificado, apesar de #195 (`fix(audit): enforce published runtime parity`) ter mexido exatamente nessa área desde a última auditoria válida.
- Proveniência/lockstep dos workers de mensageria, documentos e recurring-payables: não reverificado.
- Backup/restore de Storage privado e custódia de chaves externas: não reverificado, apesar de #182 (`fix(backup): restore dump into empty public schema`) ter mexido exatamente nessa área.
- Rollback do release candidato: não reverificado.
- Mudança de infraestrutura de staging introduzida por #256 (`fix(staging): decouple acceptance from ephemeral tunnel`) e #241/#242 (CI/runner): não validada operacionalmente nesta rodada — só a presença/sintaxe local foi coberta indiretamente pelos checks acima, não o comportamento real do pipeline.

Todos os pontos acima já estavam listados como pendentes na auditoria de 2026-09-17 e **continuam sem prova**; nada nesta rodada os resolve — ela apenas reconfirma os checks locais contra um SHA mais recente e corrige a defasagem do ledger.

## Matriz de cobertura (delta desta rodada)
| Área | Resultado | Evidência / pendência |
| --- | --- | --- |
| Governança do próprio ledger de auditoria | **CORRIGIDO (recorrência)** | ledger desatualizado por 22 commits/PRs desde 2026-09-17; atualizado agora; gate mecânico recomendado ainda não existe |
| Governança de auditoria absoluta (manifesto V5) | PASS | `absolute-audit-governance-validate.sh` verde, todos os blobs/entrypoints presentes |
| Build/lint/typecheck (local, SHA atual) | PASS | evidência acima |
| Dependências/segurança (`npm audit`) | PASS | 0 vulnerabilidades |
| Unitários/integração (local, SHA atual) | PASS | 677 PASS / 1 SKIP |
| Arquitetura/módulos/migrations | PASS | contratos verdes |
| pgTAP/RLS, E2E, staging, produção, backup/restore, rollback, workers, paridade de runtime publicado | **NÃO VALIDADO** | sem acesso a Docker/VM/staging nesta sessão |

## Achados nas diretrizes de auditoria (meta-auditoria)
- **P0 — recorrência do achado de 2026-09-17: nenhum gate mecânico impede o ledger de ficar obsoleto.** Já recomendado antes (check de CI bloqueando merge de escopo crítico — auth, schema, financeiro, workers, deploy, backup/restore, staging — sem atualização correspondente de `AUDIT_STATUS.md`). Permanece não implementado após 22 commits adicionais, incluindo múltiplos PRs rotulados `audit:`/`fix(audit)` que, pela sua própria natureza, deveriam ter disparado essa atualização. Reafirmado como pendência sistêmica prioritária, fora do escopo de correção `SAFE` desta rodada documental.
- **P1 (herdado, não corrigido) — Gate de paridade de runtime (`AUDIT_RUNTIME_PARITY_V1.md`) continua estruturalmente inexecutável a partir de uma sessão de agente sem rota de rede para o ambiente publicado.** Nenhuma sessão nessas condições deve declarar `APTO`; deve declarar `NÃO APTO` com a dívida de evidência explícita, exatamente como feito aqui.
- **P3 (herdado, não corrigido) — Ausência de prazo de validade explícito para um veredito `NÃO APTO`/`APTO`** além de "mudança material invalida". Permanece como decisão de política pendente do responsável pelo projeto.

## Regra de validade
Esta entrada cobre o código-fonte no SHA `2fe4699...` **apenas quanto aos checks locais listados**. Não recertifica homologação, produção, workers, backup/restore, rollback ou paridade de runtime publicado — todos permanecem no estado `NÃO VALIDADO` herdado desde pelo menos 2026-09-15. Qualquer mudança material subsequente (schema, auth, financeiro, workers, deploy, backup, staging) invalida esta cobertura e exige nova entrada.
