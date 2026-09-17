# Estado da Auditoria

**Status:** NÃO APTO

Auditoria de governança/meta-auditoria executada sobre as próprias diretrizes de auditoria (`AUDIT_POLICY.md`, `EXTREME_AUDIT_PROTOCOL.md`, `AUDIT_RUNTIME_PARITY_V1.md`, `AUDIT_OVERLAY.md`) e sobre o estado local do código, a partir de uma sessão remota sem acesso a VM/homologação/staging/produção. Esta rodada **não substitui** a auditoria operacional completa (UI real, staging, produção, backups) exigida pelo protocolo — ela documenta explicitamente o que foi comprovado localmente e o que permanece dívida de evidência.

## Achado de governança (P0, corrigido nesta rodada)
**COMPROVADO.** A entrada anterior deste ledger cobria o SHA `73821512f1e50fbacc24cb80d182d3e17e4f8cf0` (2026-09-15) e nunca foi atualizada apesar de **18 commits materiais** terem entrado em `main` desde então, **12 deles rotulados `fix(audit)`** (#154 a #178) — endereçando justamente os achados P0/P1 que a entrada anterior listava como pendentes. Pela própria regra de `AUDIT_POLICY.md` ("mudança material posterior invalida a cobertura correspondente"), o veredito anterior estava formalmente inválido e não foi sinalizado como tal.

Causa raiz: nenhum gate mecânico força atualização de `AUDIT_STATUS.md` quando um PR toca área crítica ou é rotulado `fix(audit)`. Recomenda-se um check de CI que bloqueie merge de PR com escopo crítico (auth, schema, financeiro, workers, deploy, backup/restore) sem alteração correspondente neste arquivo. Esta lacuna sistêmica é registrada aqui para tratamento em tarefa dedicada (fora do escopo desta rodada, que é documental).

## Última auditoria válida
- Data: 2026-09-17
- Commit/SHA de aplicação auditado (evidência local): `eff6220ea0ed530bfae48395a7da894a5cdf6f6c` (`origin/main`)
- Release/ambiente comprovado: apenas árvore local, nesta sessão. **Nenhuma evidência de homologação/produção foi reproduzida nesta rodada** — a sessão que a executou não tem rota de rede para a VM de homologação nem para staging (SSH bloqueado pela política de egress do ambiente; apenas HTTPS a hosts allowlisted).
- Veredito: **NÃO APTO PARA PRODUÇÃO** (herdado da auditoria anterior; nada nesta rodada eleva o veredito, pois os itens NÃO VALIDADO abaixo continuam sem prova)
- Confiança do veredito quanto ao código local: **alta** para a evidência listada abaixo; **inalterada (dívida de evidência)** para tudo que depende de staging/produção/VM.

## Evidência reproduzida no SHA `eff6220...` (local, sem Docker/Supabase/staging)
- `npm install`: PASS com aviso de `engines` (`node` esperado `24.19.0`, ambiente usou `22.22.2` — registrar como possível classe de drift de ambiente, não investigado nesta rodada).
- `npm run typecheck`: PASS.
- `npm run lint`: PASS, 0 erros, 2 warnings não bloqueantes (`window.location.assign` em `login-form.tsx` e `session-controls.tsx`, mesmos já conhecidos).
- `npm run arch:check`: PASS, 483 módulos / 1082 dependências, sem violações.
- `npm run modules:check`: PASS.
- `npm run migrations:check`: PASS.
- `npm run test:run`: **662 PASS / 1 SKIP**, 203 arquivos PASS / 1 arquivo SKIP. (Dois stack traces impressos durante a execução, de `scripts/preview-env.mjs` e `scripts/staging-lock.mjs`, são comportamento esperado de scripts de guarda sendo exercitados por teste, não falha.)
- `npm run build`: PASS (build de produção Next.js, todas as rotas geradas).

## Não executado nesta rodada — permanece **NÃO VALIDADO**
- `npm run supabase:reset` / `npm run supabase:test` (pgTAP/RLS): não executado — sem Docker/Supabase disponível nesta sessão.
- `npm run test:e2e` (Playwright) e qualquer homologação por UI real: não executado — sem browser contra ambiente publicado nesta sessão.
- Paridade SHA candidato × SHA servido em homologação/produção (`/api/health.buildSha`): não reverificado.
- Proveniência/lockstep dos workers de mensageria e documentos: não reverificado.
- Backup/restore de Storage privado e custódia de chaves externas: não reverificado.
- Rollback do release candidato: não reverificado.

Todos os pontos acima já estavam listados como pendentes na auditoria de 2026-09-15 e **continuam sem prova**; nada nesta rodada os resolve.

## Matriz de cobertura (delta desta rodada)
| Área | Resultado | Evidência / pendência |
| --- | --- | --- |
| Governança do próprio ledger de auditoria | **CORRIGIDO** | ledger desatualizado por 18 commits/12 PRs `fix(audit)`; atualizado agora |
| Diretrizes de auditoria (consistência interna) | PASS com ressalvas | ver achados abaixo |
| Build/lint/typecheck (local, SHA atual) | PASS | evidência acima |
| Unitários/integração (local, SHA atual) | PASS | 662 PASS / 1 SKIP |
| Arquitetura/módulos/migrations | PASS | contratos verdes |
| pgTAP/RLS, E2E, staging, produção, backup/restore, rollback, workers | **NÃO VALIDADO** | sem acesso a Docker/VM/staging nesta sessão |

## Achados nas diretrizes de auditoria (meta-auditoria)
- **P1 — `AI-TO-CLI-PROTOCOL.md` permitia dispensar confirmação humana mesmo para merge/push/deploy.** Corrigido nesta rodada: a dispensa de confirmação intermediária agora exclui explicitamente ações irreversíveis ou de alto raio de impacto.
- **P1 — Gate de paridade de runtime (`AUDIT_RUNTIME_PARITY_V1.md`) é estruturalmente inexecutável a partir de uma sessão de agente sem rota de rede para o ambiente publicado.** Nenhuma sessão nessas condições deve declarar `APTO`; deve declarar `NÃO APTO`/`APTO COM RESSALVAS` com a dívida de evidência explícita, exatamente como feito aqui. Recomenda-se adicionar esta ressalva explicitamente ao próprio `AUDIT_RUNTIME_PARITY_V1.md`.
- **P3 — Ausência de prazo de validade explícito para um veredito `NÃO APTO`/`APTO`** além de "mudança material invalida". Não corrigido nesta rodada (mudança de política, não documental urgente); registrado para decisão do responsável pelo projeto.

## Regra de validade
Esta entrada cobre o código-fonte no SHA `eff6220ea0ed530bfae48395a7da894a5cdf6f6c` **apenas quanto aos checks locais listados**. Não recertifica homologação, produção, workers, backup/restore ou rollback — todos permanecem no estado `NÃO VALIDADO` herdado da auditoria de 2026-09-15. Qualquer mudança material subsequente (schema, auth, financeiro, workers, deploy, backup) invalida esta cobertura e exige nova entrada.
