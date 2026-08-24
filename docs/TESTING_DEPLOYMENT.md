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

Checks obrigatórios planejados:

```text
install/lock integrity
lint
typecheck
unit tests
domain state/policy tests
migration apply from clean DB
migration upgrade test
RLS/authorization matrix
integration tests
contract tests
Next.js build
Playwright smoke
secret scan
security/dependency scan
```

Nem todo PR precisa de todo E2E, mas mudanças críticas disparam suíte correspondente.

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

## 5. CI e branch protection

Após o bootstrap CI:

- ativar ruleset para `main`;
- PR obrigatório;
- required checks;
- bloquear force push/deleção;
- exigir branch atualizada quando checks dependerem de estado atual;
- CODEOWNERS/review para áreas críticas quando houver revisor independente.

## 6. Merge

Preferir squash merge por Task Contract.

Título final deve referenciar feature/fix e manter Issue vinculada.

## 7. Deploy

### Preview
Cada PR elegível gera preview sem dados reais.

### Staging
Merge em branch/fluxo de staging executa migrations e smoke.

### Production
Promoção somente quando:
- CI verde;
- migration revisada;
- feature flags corretas;
- backup recente/restore strategy conhecida;
- smoke checklist definido.

## 8. Migrations

Deployment order:

1. migration backward-compatible;
2. deploy código que usa novo schema;
3. backfill assíncrono quando necessário;
4. remover coluna/contrato antigo apenas em release posterior.

Evitar migration destrutiva + código dependente no mesmo passo quando houver risco de rollback.

## 9. Feature flags

Integrações live e comportamento de alto risco entram desativados por padrão.

Flags devem ter owner e estratégia de remoção após estabilização.

## 10. Smoke pós-deploy

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

## 11. Observabilidade

Mínimos:
- taxa/latência/erros de API;
- tamanho/idade das filas;
- jobs falhos;
- webhooks duplicados/rejeitados;
- mensagens falhas;
- emissão fiscal falha/pendente;
- autenticação/erros de autorização;
- audit events para ações críticas.

## 12. Backup/restore

- backup gerenciado habilitado em produção;
- política de dump lógico externo criptografado;
- teste de restauração trimestral inicialmente;
- registrar RPO/RTO real medido no teste;
- atualizar runbook após cada exercício.

## 13. Incidente

Kill switches permitem desligar WhatsApp/e-mail/NFS-e sem tirar agenda/financeiro do ar.

Prioridade em incidente:
1. conter exposição/duplicidade;
2. proteger dados;
3. preservar evidência/audit;
4. restaurar operação mínima;
5. corrigir e adicionar teste de regressão;
6. postmortem.

## 14. Compatibilidade de runtime

Bootstrap deve usar versão Node LTS suportada pelo Next.js escolhido e versão Next.js com patches de segurança vigentes na data do scaffold. Não congelar versão vulnerável por conveniência.

## 15. Definition of Done

Todo PR segue `docs/DEFINITION_OF_DONE.md`; CI verde é necessário, mas não suficiente.
