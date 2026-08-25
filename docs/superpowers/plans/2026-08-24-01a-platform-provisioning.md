# Remote Platform Provisioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provisionar ambientes remotos isolados e vinculá-los ao repositório sem misturar secrets, dados ou deploys entre staging e production.

**Architecture:** Local/CI continuam descartáveis. Staging e production usam recursos Supabase distintos na região São Paulo e um projeto Vercel vinculado ao GitHub com variáveis separadas por environment. Production permanece sem dados reais/live providers até o go-live gate.

**Tech Stack:** Supabase Platform, Vercel, GitHub, São Paulo `sa-east-1`, environment-scoped secrets.

**Spec:** `docs/ARCHITECTURE.md` e `docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md`

## Global Constraints
- Nunca reutilizar banco, service-role key ou encryption key de staging em production.
- Nunca copiar dados de paciente de production para staging/preview.
- Região alvo do Supabase remoto: São Paulo (`sa-east-1`) quando disponível para o plano/projeto escolhido.
- Production começa vazia e com providers live desligados.
- Domínio público de produção só é conectado após checklist de go-live.

---

### Task 1: Inventário e nomenclatura de ambientes

**Files:**
- Create: `docs/PLATFORM_RESOURCES.md`

**Interfaces:**
- Produces nomes canônicos de resources e project refs não secretos.

- [ ] **Step 1: Fixar nomes**

Usar `solange-rolla-staging` e `solange-rolla-production` para Supabase; `solange-rolla-consultorio` para Vercel. Registrar IDs/project refs somente quando não forem credenciais.

- [ ] **Step 2: Registrar owners e finalidade**

Documentar owner da conta, finalidade de cada ambiente, região, data de criação e links de console. Não registrar tokens, passwords ou keys.

- [ ] **Step 3: Commit**

```bash
git add docs/PLATFORM_RESOURCES.md
git commit -m "docs: inventory isolated platform resources"
```

---

### Task 2: Criar Supabase staging

**Files:**
- Modify: `docs/PLATFORM_RESOURCES.md`
- Modify: `.env.example`

**Interfaces:**
- Produces staging remoto vazio e isolado.

- [ ] **Step 1: Criar projeto**

Criar `solange-rolla-staging` em região São Paulo. Usar password gerada/armazenada no secret manager da plataforma, nunca em issue/chat/repo.

- [ ] **Step 2: Aplicar schema somente via migrations**

Linkar CLI/CI ao project ref de staging e aplicar migrations da branch aprovada. Nenhuma alteração manual de schema pelo dashboard sem migration correspondente.

- [ ] **Step 3: Seed**

Staging recebe apenas seed sintético verificado. Providers live permanecem `false`.

- [ ] **Step 4: Smoke**

Confirmar conexão, migrations, pgTAP/RLS e que staging não contém qualquer dado real.

- [ ] **Step 5: Registrar resource metadata**

Atualizar `PLATFORM_RESOURCES.md` com project ref/region sem secrets.

- [ ] **Step 6: Commit**

```bash
git add docs/PLATFORM_RESOURCES.md .env.example
git commit -m "ops: provision isolated staging database"
```

---

### Task 3: Criar Supabase production sem dados

**Files:**
- Modify: `docs/PLATFORM_RESOURCES.md`

**Interfaces:**
- Produces production isolada, inicialmente sem usuários/pacientes reais e sem integrações live.

- [ ] **Step 1: Criar projeto production**

Criar `solange-rolla-production` em São Paulo, com password/keys próprios.

- [ ] **Step 2: Não popular fixtures**

Production não executa seed sintético operacional. Somente dados estruturais seguros (ex.: categorias/tipos/versioned configs aprovados) entram por migration/bootstrapping explícito.

- [ ] **Step 3: Feature flags**

Inicialmente `WHATSAPP_LIVE_ENABLED=false`, `NFSE_LIVE_ENABLED=false`; qualquer outro provider com efeito externo também começa desabilitado.

- [ ] **Step 4: MFA/owner**

Criação de usuário real owner só acontece no gate de homologação operacional, com MFA obrigatório antes de liberar dados reais.

- [ ] **Step 5: Registrar metadata**

Documentar project ref/region sem secret.

- [ ] **Step 6: Commit**

```bash
git add docs/PLATFORM_RESOURCES.md
git commit -m "ops: provision isolated production database"
```

---

### Task 4: Criar projeto Vercel e environments

**Files:**
- Create: `docs/VERCEL_SETUP.md`
- Modify: `docs/PLATFORM_RESOURCES.md`

**Interfaces:**
- Produces Vercel project ligado ao repo privado e environments Preview/Production claramente separados.

- [ ] **Step 1: Criar/linkar projeto**

Vercel project `solange-rolla-consultorio`, framework Next.js, repo `fredmourao-ai/solange-rolla-consultorio`. Não adicionar domínio final nesta etapa.

- [ ] **Step 2: Preview env**

Configurar variáveis de Preview para Supabase Preview Branch quando disponível; fallback conforme `01d-environments-preview`. Nunca usar production project ref/key em Preview.

- [ ] **Step 3: Production env**

Configurar apenas variáveis production correspondentes ao Supabase production e secrets production. Providers live continuam desabilitados até go-live.

- [ ] **Step 4: Staging deployment strategy**

Quando necessário, usar branch/deployment alvo documentado para staging, apontando exclusivamente ao Supabase staging. Não compartilhar variável de encryption key entre staging/production.

- [ ] **Step 5: Verificação automática**

Criar/usar script de environment assertion que compare `APP_ENV` e allowlist de project refs; deploy aborta se Preview/Staging apontar para production ou Production apontar para staging.

- [ ] **Step 6: Commit**

```bash
git add docs/VERCEL_SETUP.md docs/PLATFORM_RESOURCES.md
git commit -m "ops: configure isolated vercel environments"
```

---

### Task 5: Mapa de secrets e rotação

**Files:**
- Create: `docs/operations/SECRETS.md`
- Modify: `.env.example`

**Interfaces:**
- Produces inventário de nomes, owner, ambiente, finalidade e rotação, sem valores.

- [ ] **Step 1: Registrar categorias**

Supabase URL/public key, service-role server-only, DB credential quando necessário, `CLINICAL_ENCRYPTION_KEY_V*`, `RATE_LIMIT_HMAC_KEY`, WhatsApp, e-mail, NFS-e e secrets de assinatura de webhooks.

- [ ] **Step 2: Isolamento**

Toda secret sensível possui valor diferente em staging/production. Public anon/publishable keys também apontam para o projeto correto por ambiente.

- [ ] **Step 3: Rotação**

Definir procedimento por provider. Chaves de criptografia L3 nunca são removidas enquanto existirem envelopes com a respectiva `key_version`; rotação adiciona nova versão e muda `ACTIVE_VERSION`.

- [ ] **Step 4: Leak response**

Qualquer secret exposta em commit/log/chat deve ser considerada comprometida e rotacionada; apagar o texto não substitui rotação.

- [ ] **Step 5: Commit**

```bash
git add docs/operations/SECRETS.md .env.example
git commit -m "docs: define secret isolation and rotation"
```
