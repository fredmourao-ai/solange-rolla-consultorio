# Security & Privacy Baseline

## Objetivo

Aplicar privacy/security by design para dados administrativos, financeiros, fiscais e dados sensíveis de saúde.

## Classificação

### L0 — Público
Serviços, informações institucionais e dados destinados ao site público.

### L1 — Interno
Agenda, status operacionais e dados sem conteúdo clínico.

### L2 — Pessoal/financeiro/fiscal
CPF, endereço, contato, nascimento, pagamentos, documentos fiscais.

### L3 — Sensível
Anamnese/formulário clínico, registros psicológicos, anexos e qualquer informação de saúde.

### L4 — Segredo
Tokens, chaves API, service role, credenciais fiscais e de provedores.

## Controles por padrão

- TLS em trânsito;
- banco/storage gerenciados em região São Paulo;
- RLS default-deny;
- MFA para staff em produção;
- least privilege;
- buckets privados;
- secrets fora do código;
- logging sanitizado;
- ambientes isolados;
- backup e restore testados;
- audit trail para ações críticas.

## Matriz inicial de acesso

| Recurso | Psicóloga | Secretaria | Contabilidade | Paciente por capability |
|---|---:|---:|---:|---:|
| Cadastro administrativo | RW | RW | leitura mínima fiscal | próprio/limitado |
| Agenda | RW | RW | não | ação específica |
| Formulário preenchido | RW | status/admin conforme necessidade | não | próprio enquanto autorizado |
| Conteúdo clínico | RW + AAL2 | **negado** | **negado** | somente próprio formulário quando capability permitir |
| Financeiro a receber | RW | RW | R | não |
| Contas a pagar | RW | conforme papel definido | RW/R | não |
| NFS-e | RW | operacional | RW/R | documento próprio via acesso autorizado |
| Audit | R restrito | não/limitado | não/limitado | não |

Permissões concretas serão codificadas em policies/testes; a UI nunca é a barreira única.

## Acesso público por link

- token 256-bit ou equivalente;
- hash persistido;
- finalidade específica;
- expiração;
- revogação;
- rate limiting;
- troca por cookie HttpOnly/Secure/SameSite;
- redirect para URL sem token;
- nenhum token bruto em analytics/log/referer.

## MFA

Todos os usuários internos em produção devem atingir AAL2. Operações clínicas e alterações de segurança exigem AAL2 no banco/API, não apenas no frontend.

## Secrets

- Web/Vercel: secrets somente em environment variables protegidas.
- Supabase Edge Functions/Cron: secrets em mecanismo seguro, preferindo Vault quando aplicável.
- `.env.example` contém apenas nomes e exemplos não secretos.
- rotacionar credencial se houver suspeita de exposição.

## Logging

Usar IDs/correlation ids. Não registrar:

- CPF completo;
- conteúdo clínico;
- respostas completas de formulário;
- assinatura bruta quando desnecessária;
- tokens;
- credentials;
- XML fiscal integral.

## Audit

Auditar pelo menos:

- acesso ao clínico;
- alteração de papel/permissão;
- assinatura;
- cancelamento/reagendamento relevante;
- pagamento, desconto, isenção e estorno;
- emissão/cancelamento fiscal;
- exportação de dados/documentos.

## Storage

Buckets isolados por sensibilidade. URLs assinadas de curta duração e emitidas somente após autorização.

## Retenção e eliminação

O sistema não fará auto-delete de conteúdo clínico, fiscal ou probatório até que a política de retenção seja formalmente validada conforme obrigações legais/profissionais. Arquivamento e deleção devem preservar trilha e documentos cuja retenção seja necessária.

## Incidentes

Antes do go-live deve existir runbook contendo:

1. detectar/conter;
2. revogar credenciais/capabilities;
3. preservar evidências;
4. avaliar dados/titulares afetados;
5. restaurar serviço/dados;
6. avaliar obrigações de comunicação;
7. registrar postmortem sem expor conteúdo clínico.

## Backup

- produção em plano com backup automático;
- cópia lógica externa criptografada conforme runbook;
- restore testado em ambiente isolado;
- backup nunca é copiado para laptop/repo sem necessidade e controles.

## Desenvolvimento

- somente dados sintéticos;
- screenshots de PR não contêm dados reais;
- staging não compartilha banco/bucket com produção;
- ferramentas de IA/agentes não recebem dumps ou prontuários reais por padrão.

## Referências

- LGPD — Lei 13.709/2018.
- ANPD — Guia de Segurança da Informação para Agentes de Tratamento de Pequeno Porte.
- Supabase RLS/MFA/Security docs.
## Hardening operacional

O CI mantém testes negativos para anônimo, capability malformada e navegação
clínica, além da matriz de autorização no banco. Rotas administrativas não
podem incluir conteúdo clínico, ciphertext, respostas, CPF completo ou
diagnóstico em tela, exportação ou log.

O baseline de acessibilidade usa axe nas rotas administrativas e bloqueia
violações `critical` e `serious`. O fluxo mobile é verificado em viewport de
390x844 com zoom de 200%, foco visível e alvos de toque de pelo menos 44px.

Budgets de performance do MVP: resposta de rota administrativa em até 2s em
dataset sintético representativo, nenhuma consulta N+1 conhecida e fila sem
backlog acima do threshold operacional documentado. Medições reais devem ser
anexadas ao checklist de homologação antes do go-live.
