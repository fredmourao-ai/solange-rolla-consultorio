# Testing, Deployment & Operations

## 1. Ambientes

### Local
- Supabase CLI/local stack;
- dados sintéticos;
- providers fake/mock;
- nenhuma credencial live.

### Staging
- projeto Supabase separado;
- Vercel Preview/Staging;
- providers sandbox/test;
- dados sintéticos representativos;
- migrations iguais às de produção.

### Production
- projeto Supabase exclusivo em São Paulo;
- secrets exclusivos;
- providers live apenas via feature flags;
- nenhum seed sintético.

## 2. Pipeline de PR

Checks obrigatórios da Foundation:

```text
lint
typecheck
unit
db
build
```

Responsabilidades:
- `lint`: ESLint sobre código versionado, excluindo artefatos gerados/transitórios;
- `typecheck`: TypeScript strict sem emissão;
- `unit`: Vitest, incluindo contratos de plataforma;
- `db`: banco local limpo, migrations, seed, `db reset`, pgTAP e comparação de types Supabase gerados;
- `build`: build Next.js reproduzível, integridade do lockfile e audit de dependências em severidade alta ou crítica.

Os workflows usam Node `24.19.0`, `actions/checkout@v7`, `actions/setup-node@v7` e Supabase CLI `2.115.0`.

Além desses gates mínimos, o projeto evolui para:

```text
domain state/policy tests
migration upgrade test
RLS/authorization matrix
integration tests
contract tests
Playwright smoke
secret scan
security scan
```

Nem todo PR precisa de todo E2E, mas mudanças críticas disparam a suíte correspondente.

## 3. Test pyramid

### Unit
Maior volume. Regras puras sem rede/banco.

Casos obrigatórios:
- deadline 48h com fim de semana;
- timezone;
- máquinas de estado;
- dinheiro e saldos;
- idempotency keys;
- recorrências.

### Integration
Banco local real + migrations + casos de uso.

### Security/RLS
Testes com JWT/papéis distintos, incluindo negativas.

### Contract
Fake adapter + sandbox quando disponível.

### E2E
Fluxos de usuário essenciais e acessibilidade básica.

## 4. Regressão crítica

Todo bug de produção/homologação deve ganhar teste que falha antes da correção.

## 5. CI e proteção de `main`

O ruleset de `main` somente pode ser ativado depois de os checks permanentes existirem e passarem em execução real de PR.

Requisitos do ruleset:
- PR obrigatório;
- checks obrigatórios `lint`, `typecheck`, `unit`, `db`, `build`;
- bloquear force-push;
- bloquear deleção da branch;
- exigir branch atualizada quando os checks dependerem do estado atual de `main`;
- respeitar CODEOWNERS nas áreas de risco quando houver revisor independente disponível.

Não configurar nomes de checks hipotéticos. A proteção deve apontar apenas para checks que já foram observados com sucesso no GitHub Actions.

## 6. Dependências

Dependabot roda semanalmente para:
- `npm`;
- `github-actions`.

Limite: no máximo 5 PRs abertos por ecossistema. Atualizações de major version ou mudanças em dependências críticas continuam exigindo revisão e todos os checks.

## 7. Merge

Preferir squash merge por Task Contract.

Título final deve referenciar feature/fix e manter Issue vinculada.

## 8. Deploy

### Preview
Cada PR elegível deve gerar preview isolado sem dados reais. Preview nunca recebe secret de produção nem provider live.

O workflow de preview só é habilitado quando `SUPABASE_BRANCHING_ENABLED=true`
está configurado no GitHub Environment. Sem Branching, o CI usa banco local
descartável e o staging compartilhado é promovido somente de forma serializada.

O seed é validado por `npm run seed:check` antes de qualquer reset ou bootstrap.

### Staging
Merge em branch/fluxo de staging executa migrations e smoke.

A promoção manual usa o workflow `Staging Promote`, o grupo de concorrência
exclusivo `staging`, um commit SHA completo e `supabase db push`. `db reset` é
proibido nesse ambiente.

### Production
Promoção somente quando:
- CI verde;
- migration revisada;
- feature flags corretas;
- backup recente/restore strategy conhecida;
- smoke checklist definido;
- security gate do dia do deploy aprovado.

## 9. Migrations

Deployment order:

1. migration backward-compatible;
2. deploy código que usa novo schema;
3. backfill assíncrono quando necessário;
4. remover coluna/contrato antigo apenas em release posterior.

Evitar migration destrutiva + código dependente no mesmo passo quando houver risco de rollback.

## 10. Feature flags

Integrações live e comportamento de alto risco entram desativados por padrão.

Flags devem ter owner e estratégia de remoção após estabilização.

## 11. Smoke pós-deploy

Verificar:
- login/MFA;
- leitura de agenda;
- criação de registro administrativo sintético permitido pelo ambiente;
- fila saudável;
- webhooks respondendo;
- storage privado não público;
- erros 5xx/anomalias;
- migrations aplicadas.

Produção não usa paciente real para smoke destrutivo.

## 12. Observabilidade

Mínimos:
- taxa/latência/erros de API;
- tamanho/idade das filas;
- jobs falhos;
- webhooks duplicados/rejeitados;
- mensagens falhas;
- emissão fiscal falha/pendente;
- autenticação/erros de autorização;
- audit events para ações críticas.

## 13. Backup/restore

- backup gerenciado habilitado em produção;
- política de dump lógico externo criptografado;
- teste de restauração trimestral inicialmente;
- registrar RPO/RTO real medido no teste;
- atualizar runbook após cada exercício.

## 14. Incidente

Kill switches permitem desligar WhatsApp/e-mail/NFS-e sem tirar agenda/financeiro do ar.

Prioridade em incidente:
1. conter exposição/duplicidade;
2. proteger dados;
3. preservar evidência/audit;
4. restaurar operação mínima;
5. corrigir e adicionar teste de regressão;
6. postmortem.

## 15. Compatibilidade e security gate

Bootstrap usa versão Node suportada pelo Next.js escolhido e versão Next.js com patches de segurança vigentes na data de promoção.

No dia de qualquer deploy de produção:
1. confirmar versão suportada do Next.js;
2. revisar advisories publicados desde o último deploy;
3. executar audit de dependências;
4. não promover se houver advisory crítico aplicável sem mitigação aprovada;
5. upgrades de framework passam por CI completo e preview antes da promoção.

## 16. Definition of Done

Todo PR segue `docs/DEFINITION_OF_DONE.md`; CI verde é necessário, mas não suficiente.

## 17. Observabilidade operacional

Requests e jobs devem carregar um `correlation_id` opaco, sem CPF, telefone ou
qualquer identificador clínico. O logger estruturado redige chaves de risco e
contatos antes de escrever no log técnico; audit log continua sendo o registro
de ações relevantes e não depende de `console.log`.

O endpoint `/api/health` retorna somente versão, ambiente, estado booleano de
configuração e correlation ID. Nunca retorna URL de banco, token, secret,
payload de provider ou dados pessoais.

Os thresholds operacionais do MVP estão em
`src/platform/observability/metrics.ts`: qualquer dead-letter ou falha fiscal
definitiva exige alerta, backlog com mais de 300 segundos exige investigação,
falha de health exige alerta e restore com mais de 90 dias exige novo drill.
O destino de alertas é configurado fora do código.
