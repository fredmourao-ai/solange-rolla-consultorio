# References — researched 2026-08-24

Este arquivo registra fontes oficiais/primárias usadas na arquitetura. Revalidar itens fiscais, jurídicos e versões de software imediatamente antes do go-live.

## Plataforma

### Supabase Regions
https://supabase.com/docs/guides/platform/regions

Decisão: usar região específica `sa-east-1` (São Paulo) para produção.

### Supabase Row Level Security
https://supabase.com/docs/guides/database/postgres/row-level-security

Decisão: RLS default-deny em tabelas expostas e testes de autorização positivos/negativos.

### Supabase MFA
https://supabase.com/docs/guides/auth/auth-mfa

Decisão: AAL2/MFA para staff em produção, com reforço no acesso clínico.

### Supabase Queues
https://supabase.com/docs/guides/queues

Decisão: PGMQ/Supabase Queues como fila durável inicial; não adicionar broker externo no MVP.

### Supabase Cron
https://supabase.com/docs/guides/cron

Decisão: Cron identifica/enfileira jobs; integrações são processadas por workers.

### Supabase Scheduling Edge Functions
https://supabase.com/docs/guides/functions/schedule-functions

Decisão: Edge Functions como runtime inicial de consumers/dispatchers.

### Supabase Backups
https://supabase.com/docs/guides/platform/backups

Nota em 2026-08-24: planos pagos possuem backup diário; PITR é opção adicional. Projeto exigirá restore testado.

## Next.js

### Next.js Blog / Security Releases
https://nextjs.org/blog

Situação em 2026-08-24: Next.js anunciou security release para 2026-08-26, incluindo correção crítica para linhas 16.3 e 15.5. Bootstrap deve escolher versão já corrigida vigente na data de scaffold.

## GitHub

### Rulesets
https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets

Decisão: proteger `main` com PR/checks e bloqueio de force push após CI existir.

### CODEOWNERS
https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

Decisão: ownership explícito para governança/áreas críticas; expandir para times quando colaboradores forem adicionados.

## Proteção de dados

### ANPD — materiais e publicações
https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes

### ANPD — Guia de Segurança da Informação para Agentes de Tratamento de Pequeno Porte
https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte

Decisões: security/privacy by design, controle de acesso, backups, gestão de incidentes e minimização.

### LGPD — Lei 13.709/2018
https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

Nota: dados referentes à saúde são dados pessoais sensíveis; medidas de segurança devem existir desde concepção até execução.

## Psicologia / prática profissional

### Conselho Federal de Psicologia
https://site.cfp.org.br/

### Material/Código profissional 2025 consultado
https://transparencia.cfp.org.br/wp-content/uploads/sites/29/2025/04/CodigoDeEtica_2025_Digital.pdf

Ponto relevante: contrato de psicoterapia deve evidenciar direitos/deveres, condições, objetivos, honorários, frequência, tempo de sessão, modalidade e registro do serviço.

Antes de produção, conferir resolução/código vigente e orientação do CRP aplicável.

## Assinatura/documentos eletrônicos

### MP 2.200-2/2001
https://www.planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm

Uso arquitetural: manter evidência de autoria/integridade e permitir evolução para provider de assinatura mais forte sem impor certificado ao paciente comum.

## NFS-e Nacional

### Documentação atual de produção
https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/documentacao-atual

Atualizada em 2026-08-15 no momento da pesquisa; inclui manuais API, XSD e anexos vigentes.

### Produção restrita / homologação
https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/producao-restrita

Decisão: validar adapter fiscal em ambiente de testes antes de qualquer live.

### Atualizações e implantações
https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/atualizacoes-e-implantacoes

Nota: mudanças de layout/IBS/CBS continuam ocorrendo em 2026; adapter precisa ser isolado e versionável.

### Simples Nacional — Emissor Nacional
https://www.gov.br/nfse/pt-br/noticias/nfs-e-e-simples-nacional-obrigatoriedade-de-emissao-atraves-do-emissor-nacional

Na pesquisa de 2026-08-24, notícia oficial indica obrigatoriedade para ME/EPP do Simples a partir de 2026-09-01. Revalidar antes do live.

## Belo Horizonte / BHISS

### BHISS
https://prefeitura.pbh.gov.br/fazenda/bhiss

### Avisos BHISS
https://prefeitura.pbh.gov.br/fazenda/bhiss/avisos

Na pesquisa de 2026-08-24, aviso de 2026-07-27 informa adiamento para 2027-01-01 da obrigatoriedade de documentos fiscais por pessoas físicas, com emissão voluntária possível mediante habilitação. Isso não define a situação do prestador do projeto; CPF/CNPJ/regime devem ser confirmados.

## Site institucional

https://www.solangerolla.com.br/

Uso: fonte pública inicial para apresentação, formação, serviços, identidade visual e links de contato. Não será fonte operacional nem dependência de produção.

## Regra de atualização

Dependências e legislação mudam. Toda task `high/critical` que dependa de fonte externa deve revalidar a referência vigente e registrar data/versão no PR.
