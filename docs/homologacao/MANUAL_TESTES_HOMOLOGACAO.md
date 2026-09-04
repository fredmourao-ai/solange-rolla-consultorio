# Manual completo de testes de homologação

## 1. Finalidade

Este manual descreve **todas as rotinas funcionais e operacionais conhecidas do projeto** que devem ser verificadas antes da aprovação final. Ele cobre caminhos felizes, bordas, falhas, segurança, idempotência, backup e recuperação.

A coluna de estado inicial usa:

- `READY`: existe caminho real para executar o teste no código candidato, sujeito à implantação correta;
- `PARTIAL`: parte do fluxo é alcançável, mas falta uma etapa real;
- `BLOCKED`: não existe hoje caller/UI/worker implantado suficiente para executar o cenário completo;
- `PROD-GATE`: pode ser simulado/homologado, mas a ativação live depende de requisito externo de produção.

**Nunca transformar `PARTIAL` ou `BLOCKED` em PASS apenas por existir teste unitário.**

O estado técnico corrente e o rastreamento por issue/PR estão em `PENDENCIAS_TECNICAS_HOMOLOGACAO.md`; em caso de divergência entre uma marcação inicial deste manual e aquele documento, prevalece o status técnico mais recente.

## 2. Preparação de cada rodada

Antes de testar, registrar:

- data/hora;
- nome do testador;
- SHA do Git homologado;
- SHA/versão efetivamente implantada;
- URL do ambiente;
- versão das migrations;
- estado dos feature flags externos;
- identificador dos dados de teste;
- evidências coletadas.

Se o SHA implantado for diferente do SHA candidato, interromper a rodada de homologação funcional e corrigir a implantação.

## 3. Dados permitidos

1. Priorizar fixtures sintéticas.
2. Para validar entrega real, podem ser utilizados exclusivamente os dados pessoais do próprio patrocinador/testador que autorizou a homologação.
3. Não inserir dados de terceiros/pacientes reais da cliente.
4. Não registrar conteúdo clínico verdadeiro; usar conteúdo fictício mesmo quando o cadastro base for do testador.
5. Screenshots/evidências não devem expor tokens, secrets, CPF completo nem texto clínico.

---

# Fase 0 — Ambiente, versão e saúde

### H-ENV-001 — SHA implantado
**Estado:** READY

1. Ler SHA candidato do GitHub.
2. Ler SHA registrado pelo ambiente.
3. Confirmar igualdade exata.

**Esperado:** mesmo SHA em código, artefato e evidência da rodada.

### H-ENV-002 — Containers essenciais
**Estado:** READY

Validar app, gateway, banco, auth, storage, worker de documentos e demais componentes requeridos pelo SHA.

**Esperado:** componentes saudáveis; nenhum restart loop.

### H-ENV-003 — Health endpoint
**Estado:** READY

Acessar `/api/health`.

**Esperado:** HTTP 200 e nenhum detalhe sensível.

### H-ENV-004 — Páginas públicas básicas
**Estado:** READY

Validar `/`, `/login`, link expirado e página final do formulário.

**Esperado:** carregamento sem 5xx e sem indexação indevida do sistema privado.

### H-ENV-005 — Preflight automatizado
**Estado:** READY

Executar o preflight oficial do ambiente.

**Esperado:** `PREFLIGHT=PASS` no mesmo SHA da rodada.

### H-ENV-006 — Espaço em disco
**Estado:** READY

Verificar root, Docker e volume de backup.

**Esperado:** folga suficiente para logs, builds, banco e backup; alertar se uso do root atingir 85%.

---

# Fase 1 — Autenticação, sessão e autorização

### H-AUTH-001 — Login válido
**Estado:** READY após correção de segurança do staging

Entrar com o usuário administrador de homologação.

**Esperado:** sessão autenticada e dashboard carregado.

### H-AUTH-002 — Senha inválida
**Estado:** READY

**Esperado:** login recusado sem revelar se conta existe além do necessário.

### H-AUTH-003 — Usuário anônimo em rotas protegidas
**Estado:** BLOCKED no `main` auditado; corrigido no PR #70

Tentar diretamente `/dashboard`, `/agenda`, `/pessoas`, `/eventos`, `/financeiro`, `/fiscal`, `/relatorios` sem sessão.

**Esperado:** redirect para `/login`; nunca renderizar AppShell com papel fallback.

### H-AUTH-004 — Logout
**Estado:** READY quando disponível na shell

**Esperado:** sessão invalidada; voltar a rota protegida exige novo login.

### H-AUTH-005 — Sessão expirada
**Estado:** READY

Invalidar sessão e tentar ação mutável.

**Esperado:** ação recusada e nenhuma alteração persistida.

### H-AUTH-006 — MFA clínico
**Estado:** READY com usuário `psychologist_owner` AAL2

1. Acessar registro clínico sem AAL2.
2. Repetir após AAL2.

**Esperado:** sem AAL2, negar/redirecionar; com AAL2 e papel correto, liberar.

### H-AUTH-007 — Papel sem acesso clínico
**Estado:** READY com fixture de papel restrito

**Esperado:** conteúdo clínico permanece inacessível e não aparece em relatórios/APIs administrativas.

---

# Fase 2 — Dashboard

### H-DASH-001 — Atenção Hoje
**Estado:** READY

Validar indicadores, itens próximos, pendências e links.

**Esperado:** valores compatíveis com os registros; nenhum conteúdo clínico.

### H-DASH-002 — Estado vazio
**Estado:** READY

**Esperado:** mensagens de vazio claras; sem crash.

### H-DASH-003 — Erro de leitura
**Estado:** READY em teste controlado

**Esperado:** erro observável e sanitizado; não mostrar chave, SQL ou PII.

---

# Fase 3 — Pessoas

### H-PEO-001 — Criar pessoa
**Estado:** READY

Criar cadastro com dados sintéticos ou dados autorizados do testador.

**Esperado:** cadastro único, sem duplicação silenciosa.

### H-PEO-002 — Campos obrigatórios
**Estado:** READY

Omitir campos obrigatórios.

**Esperado:** validação clara; nenhuma gravação parcial inválida.

### H-PEO-003 — CPF e dados fiscais
**Estado:** READY com dados sintéticos

**Esperado:** formato/validação conforme regra; CPF completo não aparece em logs.

### H-PEO-004 — Preferência de comunicação
**Estado:** READY

Alterar opt-in/opt-out dos canais.

**Esperado:** preferência refletida na seleção de destinatário das automações.

### H-PEO-005 — Responsável financeiro diferente
**Estado:** READY em dados/modelo; confirmar UI

**Esperado:** pessoa atendida e pagador permanecem entidades distintas e rastreáveis.

### H-PEO-006 — Data de nascimento
**Estado:** READY

**Esperado:** persistência correta e elegibilidade para aniversário respeitando preferências.

### H-PEO-007 — Duplicidade
**Estado:** READY

Tentar cadastrar a mesma pessoa novamente pelos identificadores relevantes.

**Esperado:** comportamento explícito; não criar duplicidade acidental.

---

# Fase 4 — Agenda e agendamento

### H-APT-001 — Visualizar agenda dia/semana
**Estado:** READY

**Esperado:** horários, status e nomes coerentes.

### H-APT-002 — Criar consulta
**Estado:** BLOCKED no `main` auditado; Issue #75

Criar consulta associada à pessoa e serviço.

**Esperado:** `starts_at`, timezone, preço/política e deadline persistidos corretamente.

### H-APT-003 — Timezone São Paulo
**Estado:** READY no domínio; execução pela UI depende Issue #75

Criar horário e conferir UTC x `America/Sao_Paulo`.

**Esperado:** nenhuma mudança de horário por conversão incorreta.

### H-APT-004 — Conflito de agenda
**Estado:** BLOCKED para homologação pela UI; Issue #75

Tentar sobreposição proibida.

**Esperado:** recusa clara e sem registro órfão.

### H-APT-005 — Política histórica
**Estado:** READY no domínio; exercício pela UI depende Issue #75

Alterar versão da política para novos registros.

**Esperado:** consulta existente mantém snapshot/deadline original.

### H-APT-006 — Deadline segunda-feira
**Estado:** READY

**Esperado:** cruza fim de semana conforme 48 horas computáveis.

### H-APT-007 — Deadline terça-feira
**Estado:** READY

**Esperado:** sexta-feira anterior no mesmo horário.

### H-APT-008 — Deadline quarta/quinta/sexta
**Estado:** READY

**Esperado:** exatamente 48 horas em dias computáveis.

### H-APT-009 — Consulta sábado
**Estado:** READY

**Esperado:** deadline quinta-feira, mesmo horário.

### H-APT-010 — Consulta domingo
**Estado:** READY

**Esperado:** deadline quinta-feira, mesmo horário.

---

# Fase 5 — Formulário pré-atendimento

### H-FRM-001 — Abertura por capability link
**Estado:** READY

**Esperado:** token válido abre apenas o recurso/escopo correto.

### H-FRM-002 — Link inválido
**Estado:** READY

**Esperado:** não revelar dados; mostrar página segura de erro/expiração.

### H-FRM-003 — Link expirado
**Estado:** READY

**Esperado:** acesso negado; token não reutilizado.

### H-FRM-004 — Draft
**Estado:** READY

Preencher parcialmente e salvar conforme fluxo existente.

**Esperado:** conteúdo fica restrito e retomável conforme regra.

### H-FRM-005 — Campos obrigatórios
**Estado:** READY

**Esperado:** impedir avanço quando requisito obrigatório estiver ausente.

### H-FRM-006 — Revisão antes de assinar
**Estado:** READY

**Esperado:** usuário vê versão final exata que será congelada.

### H-FRM-007 — Declaração de veracidade
**Estado:** READY

**Esperado:** aceite explícito registrado com versão correspondente.

### H-FRM-008 — Termos/política de cancelamento
**Estado:** READY

**Esperado:** versão aplicável aparece antes da assinatura e fica vinculada à submissão.

---

# Fase 6 — Assinatura e documento

### H-SIG-001 — Assinatura eletrônica simples
**Estado:** READY

**Esperado:** identidade declarada, horário, versão e evidências persistidas.

### H-SIG-002 — Hash do conteúdo congelado
**Estado:** READY

**Esperado:** SHA-256 associado ao documento imutável.

### H-SIG-003 — Tentativa de alteração após assinatura
**Estado:** READY

**Esperado:** não alterar silenciosamente; correção gera nova versão/fluxo.

### H-SIG-004 — Geração de PDF
**Estado:** READY

**Esperado:** worker gera documento correspondente ao conteúdo assinado.

### H-SIG-005 — Worker indisponível
**Estado:** READY em cenário controlado

**Esperado:** job entra em retry/falha visível; não perde solicitação.

### H-SIG-006 — Acesso ao documento privado
**Estado:** READY

**Esperado:** acesso apenas autorizado/temporário; bucket não público.

### H-SIG-007 — Reexecução idempotente
**Estado:** READY

**Esperado:** não criar documentos duplicados equivalentes.

---

# Fase 7 — Confirmação, cancelamento e reagendamento

### H-CNF-001 — Abrir link de confirmação
**Estado:** READY quando link foi emitido

**Esperado:** exibir consulta e ações permitidas sem conteúdo clínico.

### H-CNF-002 — Confirmar consulta
**Estado:** READY

**Esperado:** status atualizado idempotentemente e auditado.

### H-CNF-003 — Cancelar antes do deadline
**Estado:** READY

**Esperado:** `cancelled_in_time`, sem cobrança automática indevida.

### H-CNF-004 — Cancelar exatamente no deadline
**Estado:** READY

**Esperado:** ainda `cancelled_in_time`.

### H-CNF-005 — Cancelar 1 ms após deadline
**Estado:** READY

**Esperado:** classificar como tardio e exigir reconhecimento explícito da regra aplicável.

### H-CNF-006 — Cancelamento tardio sem aceite
**Estado:** READY

**Esperado:** operação recusada; nenhuma alteração silenciosa.

### H-CNF-007 — Cancelamento tardio com aceite
**Estado:** READY para status; cobrança depende PR #71

**Esperado:** status tardio registrado com versão/snapshot de política.

### H-CNF-008 — Solicitar reagendamento
**Estado:** PARTIAL; solicitação pública pode existir, conclusão administrativa depende Issue #75

**Esperado:** pedido registrado; paciente não escolhe novo horário diretamente; secretaria conclui o novo agendamento pela rotina protegida.

### H-CNF-009 — Reuso do link
**Estado:** READY

**Esperado:** nonce/idempotência impedem repetição perigosa.

### H-CNF-010 — Link após consulta finalizada
**Estado:** READY

**Esperado:** nenhuma transição inválida.

---

# Fase 8 — Automação de confirmação 24h

### H-AUTO-001 — Seleção de consulta elegível 22–26h
**Estado:** BLOCKED no `main`; implementação proposta no PR #72

**Esperado:** somente consultas elegíveis entram na programação.

### H-AUTO-002 — Emissão do capability token
**Estado:** BLOCKED no `main` para agendamento automático

**Esperado:** token bruto entregue ao link, somente hash persistido.

### H-AUTO-003 — Enfileiramento idempotente
**Estado:** BLOCKED no `main`

**Esperado:** polling repetido não duplica mensagem.

### H-AUTO-004 — Consulta fora da janela
**Estado:** BLOCKED no `main`

**Esperado:** não enfileirar.

### H-AUTO-005 — Consulta já confirmada/cancelada
**Estado:** BLOCKED no `main`

**Esperado:** não enfileirar confirmação desnecessária.

---

# Fase 9 — Mensageria: e-mail e WhatsApp

### H-MSG-001 — Worker em execução
**Estado:** código READY; implantação do demo auditado estava desatualizada, Issue #82

**Esperado:** container/processo ativo e heartbeat recente.

### H-MSG-002 — Outbox -> queue -> provider
**Estado:** READY no código atual após implantação

**Esperado:** mensagem percorre os estados sem perda.

### H-MSG-003 — E-mail real para testador
**Estado:** READY após credencial temporária segregada

**Esperado:** mensagem recebida; remetente e texto corretos; nenhum dado clínico.

### H-MSG-004 — WhatsApp real para testador
**Estado:** PROD-GATE/CONFIG

**Esperado:** entrega real comprovada no aparelho autorizado. Para mensagem iniciada pelo negócio fora da janela de atendimento, usar template aprovado pela Meta.

### H-MSG-005 — Opt-out
**Estado:** READY

**Esperado:** canal desabilitado não é usado.

### H-MSG-006 — Endereço/número ausente
**Estado:** READY

**Esperado:** resolver canal alternativo ou pular de modo auditável; não falhar em loop.

### H-MSG-007 — Falha transitória
**Estado:** READY

**Esperado:** retry controlado/backoff, tentativa registrada sem segredo.

### H-MSG-008 — Falha permanente
**Estado:** READY

**Esperado:** status final de falha; não retry infinito.

### H-MSG-009 — Webhook duplicado
**Estado:** READY

**Esperado:** `provider_event_id` deduplicado.

### H-MSG-010 — Texto em lock screen
**Estado:** READY para revisão humana

**Esperado:** texto administrativo neutro; sem diagnóstico, terapia ou informação sensível.

---

# Fase 10 — Atendimento e clínico

### H-CLI-001 — Marcar consulta realizada
**Estado:** BLOCKED para homologação pela UI no `main` auditado; Issue #75

**Esperado:** status de agenda muda sem alterar financeiro/fiscal implicitamente.

### H-CLI-002 — Criar registro clínico
**Estado:** READY com `psychologist_owner` AAL2

Usar somente texto clínico fictício.

**Esperado:** payload criptografado; auditoria gerada.

### H-CLI-003 — Ler timeline clínica
**Estado:** READY com AAL2

**Esperado:** metadados corretos; conteúdo disponível apenas ao papel autorizado.

### H-CLI-004 — Versão/supersede
**Estado:** READY

**Esperado:** correção cria novo registro; histórico anterior preservado.

### H-CLI-005 — Usuário administrativo tenta ler clínico
**Estado:** READY

**Esperado:** negar.

### H-CLI-006 — Clínico em relatório/exportação
**Estado:** READY negativo

**Esperado:** nenhum conteúdo clínico em relatório administrativo.

---

# Fase 11 — Falta/no-show e cancelamento tardio com cobrança

### H-NSH-001 — Marcar no-show na agenda
**Estado:** BLOCKED no `main`; PR #71

**Esperado:** status `no_show`, auditado.

### H-NSH-002 — Cobrar no-show permitido pela política
**Estado:** BLOCKED no `main`; PR #71

**Esperado:** recebível com valor do serviço, pagador/pessoa corretos, idempotency key e snapshot de política.

### H-NSH-003 — Política desabilita cobrança
**Estado:** BLOCKED no `main`; PR #71

**Esperado:** ação de cobrança não deve ser oferecida nem criar valor.

### H-NSH-004 — Preço ausente
**Estado:** BLOCKED no `main`; PR #71 precisa falhar fechado

**Esperado:** recusar; nunca gerar recebível de R$0,00 silenciosamente.

### H-NSH-005 — Clique/requisição duplicada
**Estado:** BLOCKED no `main`; PR #71

**Esperado:** exatamente um recebível, inclusive sob concorrência.

### H-NSH-006 — Exceção manual/isenção
**Estado:** PARTIAL

**Esperado:** motivo obrigatório e auditado; histórico preservado.

---

# Fase 12 — Recebíveis, pagamentos, ajustes e estornos

### H-FIN-001 — Listar recebíveis
**Estado:** READY

**Esperado:** paciente, pagador, origem, valor pago e saldo corretos.

### H-FIN-002 — Registrar pagamento total
**Estado:** BLOCKED pela UI no `main`; Issue #76

**Esperado:** pagamento idempotente; saldo zero; agenda não muda automaticamente.

### H-FIN-003 — Pagamento parcial
**Estado:** BLOCKED pela UI no `main`; Issue #76

**Esperado:** saldo remanescente correto.

### H-FIN-004 — Segundo pagamento
**Estado:** BLOCKED pela UI no `main`; Issue #76

**Esperado:** acumular sem exceder regras do domínio.

### H-FIN-005 — Método de pagamento
**Estado:** BLOCKED pela UI no `main`; Issue #76

Validar pix, dinheiro, débito, crédito, transferência e outro conforme disponibilidade.

### H-FIN-006 — Ajuste/isenção
**Estado:** BLOCKED pela UI no `main`; Issue #76

**Esperado:** justificativa e auditoria; nenhum delete físico.

### H-FIN-007 — Estorno parcial
**Estado:** BLOCKED pela UI no `main`; Issue #76

**Esperado:** motivo obrigatório, histórico mantido.

### H-FIN-008 — Estorno total
**Estado:** BLOCKED pela UI no `main`; Issue #76

**Esperado:** resultado financeiro coerente; pagamento original preservado.

### H-FIN-009 — Idempotência financeira
**Estado:** BLOCKED pela UI no `main`; Issue #76

**Esperado:** repetição da mesma operação não duplica dinheiro.

---

# Fase 13 — Contas a pagar

### H-PAY-001 — Criar despesa
**Estado:** BLOCKED pela UI no `main`; Issue #76

**Esperado:** centavos inteiros, categoria, fornecedor e vencimento.

### H-PAY-002 — Baixa parcial
**Estado:** BLOCKED pela UI no `main`; Issue #76

### H-PAY-003 — Baixa total
**Estado:** BLOCKED pela UI no `main`; Issue #76

### H-PAY-004 — Recorrência mensal
**Estado:** BLOCKED pela UI no `main`; Issue #76

**Esperado:** geração idempotente por competência.

### H-PAY-005 — Fim de mês
**Estado:** BLOCKED pela UI no `main`; Issue #76

**Esperado:** fallback explícito para meses menores.

### H-PAY-006 — Recibo privado
**Estado:** BLOCKED pela UI no `main`; Issue #76

**Esperado:** armazenamento/acesso privado.

---

# Fase 14 — Eventos

### H-EVT-001 — Listar eventos
**Estado:** READY

### H-EVT-002 — Criar evento
**Estado:** BLOCKED pela UI no `main`; Issue #77

Validar título, datas, modalidade, local, capacidade e preço.

### H-EVT-003 — Inscrever participante
**Estado:** BLOCKED pela UI no `main`; Issue #77

**Esperado:** reutilizar cadastro de Pessoa.

### H-EVT-004 — Limite de capacidade
**Estado:** BLOCKED pela UI no `main`; Issue #77

**Esperado:** impedir excedente conforme regra.

### H-EVT-005 — Cancelar inscrição
**Estado:** BLOCKED pela UI no `main`; Issue #77

**Esperado:** não apagar pagamento; estorno é operação separada.

### H-EVT-006 — Registrar presença
**Estado:** BLOCKED pela UI no `main`; Issue #77

### H-EVT-007 — Registrar despesa do evento
**Estado:** BLOCKED pela UI no `main`; Issue #77

### H-EVT-008 — Receita/resultado do evento
**Estado:** PARTIAL — leitura de relatório existe; operação depende Issue #77

**Esperado:** inscrições, pagamentos e despesas reconciliados.

### H-EVT-009 — NFS-e de evento
**Estado:** BLOCKED operacionalmente e PROD-GATE fiscal; Issues #77/#78

**Esperado:** tratamento fiscal separado e aprovado.

---

# Fase 15 — Fiscal / NFS-e

### H-FIS-001 — Visualizar fila fiscal
**Estado:** READY

### H-FIS-002 — Readiness fiscal incompleta
**Estado:** READY em domínio

**Esperado:** bloquear emissão e listar motivo.

### H-FIS-003 — Solicitar NFS-e mock
**Estado:** BLOCKED pela UI no `main`; Issue #78

**Esperado:** documento idempotente e enfileirado.

### H-FIS-004 — Worker fiscal mock
**Estado:** READY em integração, depende de caller da Issue #78

**Esperado:** transições corretas e retry sanitizado.

### H-FIS-005 — Repetir solicitação
**Estado:** BLOCKED pela UI no `main`; Issue #78

**Esperado:** retornar documento/request existente.

### H-FIS-006 — Artefato XML/PDF
**Estado:** PARTIAL; fluxo operacional depende Issue #78

**Esperado:** storage privado; nunca logar XML bruto com PII.

### H-FIS-007 — Cancelar NFS-e mock
**Estado:** BLOCKED pela UI no `main`; Issue #78

### H-FIS-008 — Substituição
**Estado:** PROD-GATE/contabilidade

### H-FIS-009 — Consulta realizada x no-show x cancelamento tardio x evento
**Estado:** PROD-GATE/contabilidade para regra definitiva; execução mock depende Issue #78

**Esperado:** cada origem usa tratamento parametrizado e aprovado; não presumir equivalência tributária.

### H-FIS-010 — Flag live
**Estado:** READY negativo

**Esperado:** NFS-e live permanece impossível fora de produção/aprovação.

---

# Fase 16 — Relatórios e exportações

### H-REP-001 — Relatório financeiro
**Estado:** READY

**Esperado:** realizado, projetado e vencidos coerentes.

### H-REP-002 — Relatório de agenda
**Estado:** READY

**Esperado:** total, realizadas, pendentes e faltas coerentes.

### H-REP-003 — Relatório de eventos
**Estado:** READY para leitura resumida

### H-REP-004 — Relatório fiscal
**Estado:** READY

### H-REP-005 — Janela de 30 dias/timezone
**Estado:** READY

**Esperado:** corte em `America/Sao_Paulo`.

### H-REP-006 — CSV
**Estado:** BLOCKED — caminho real não encontrado; Issue #79

### H-REP-007 — XLSX
**Estado:** BLOCKED — caminho real não encontrado; Issue #79

### H-REP-008 — PDF
**Estado:** BLOCKED — caminho real não encontrado; Issue #79

### H-REP-009 — Privacidade de exportação
**Estado:** READY negativo no design; exportação real depende Issue #79

**Esperado:** nenhuma informação clínica em exportações administrativas.

---

# Fase 17 — Aniversário e demais automações

### H-BDAY-001 — Pessoa elegível
**Estado:** BLOCKED/PARTIAL; caller/cron não encontrado, Issue #81

**Esperado:** uma mensagem por aniversário e canal permitido.

### H-BDAY-002 — Opt-out
**Estado:** BLOCKED/PARTIAL; Issue #81

**Esperado:** não enviar.

### H-BDAY-003 — Reexecução do cron
**Estado:** BLOCKED/PARTIAL; Issue #81

**Esperado:** idempotente; sem mensagem duplicada.

### H-BDAY-004 — Demais templates automáticos
**Estado:** PARTIAL; Issue #81 para aniversário e PR #72 para confirmação automática

**Esperado:** somente templates revisados/ativos podem ser enviados.

---

# Fase 18 — Auditoria e trilha histórica

### H-AUD-001 — Ações críticas geram audit event
**Estado:** READY

Verificar criação/alteração de registros críticos disponíveis.

### H-AUD-002 — Metadata sanitizada
**Estado:** READY

**Esperado:** IDs/códigos permitidos; sem secrets/CPF completo/conteúdo clínico.

### H-AUD-003 — Correlation ID
**Estado:** READY

**Esperado:** operação e tentativa relacionadas rastreáveis.

### H-AUD-004 — Histórico imutável
**Estado:** READY

**Esperado:** correções importantes preservam estado anterior/novo.

---

# Fase 19 — LGPD e privacidade operacional

### H-LGPD-001 — Inventário de dados
**Estado:** READY documental

Conferir categorias, finalidade, acesso e retenção.

### H-LGPD-002 — Solicitação de acesso do titular
**Estado:** READY como exercício operacional

**Esperado:** localizar dados sem expor terceiros.

### H-LGPD-003 — Correção
**Estado:** READY como exercício operacional

**Esperado:** corrigir dados cadastrais preservando auditoria aplicável.

### H-LGPD-004 — Exclusão quando aplicável
**Estado:** READY como exercício operacional

**Esperado:** não apagar registros sujeitos a retenção legal/profissional; justificar bloqueio/anonimização.

### H-LGPD-005 — Retenção
**Estado:** READY documental

**Esperado:** regras diferenciadas para cadastro, clínico, fiscal, documentos assinados, auditoria e logs.

### H-LGPD-006 — Incidente
**Estado:** READY documental

Simular descoberta, contenção, avaliação, registro e escalonamento.

---

# Fase 20 — Segurança negativa

### H-SEC-001 — RLS anônimo
**Estado:** READY automatizado/manual controlado

### H-SEC-002 — RLS papel incorreto
**Estado:** READY

### H-SEC-003 — Bucket privado
**Estado:** READY

### H-SEC-004 — Capability de outro recurso
**Estado:** READY

**Esperado:** escopo impede acesso lateral.

### H-SEC-005 — Token expirado/reutilizado
**Estado:** READY

### H-SEC-006 — Service role no browser
**Estado:** READY negativo

**Esperado:** nunca exposto ao cliente.

### H-SEC-007 — Robots/indexação
**Estado:** READY

**Esperado:** app privado não deve ser indexado.

### H-SEC-008 — Erros e stack traces
**Estado:** READY

**Esperado:** resposta pública não expõe detalhes internos/sigilosos.

---

# Fase 21 — Resiliência, filas e idempotência

### H-RES-001 — Reprocessar job
**Estado:** READY

**Esperado:** efeito final único.

### H-RES-002 — Provider timeout
**Estado:** READY

**Esperado:** timeout controlado e retry apenas quando seguro.

### H-RES-003 — Banco temporariamente indisponível
**Estado:** READY em cenário controlado

**Esperado:** falha visível; nenhuma confirmação falsa de sucesso.

### H-RES-004 — Worker reinicia
**Estado:** READY

**Esperado:** fila persiste e trabalho continua com idempotência.

### H-RES-005 — Webhook repetido
**Estado:** READY

### H-RES-006 — Duplo clique em ação financeira
**Estado:** BLOCKED até caminho financeiro real; Issue #76

**Esperado:** não duplicar cobrança/pagamento.

---

# Fase 22 — Mobile, acessibilidade e UX

### H-UX-001 — iPhone/mobile
**Estado:** READY nas rotinas atualmente alcançáveis

Testar login, pessoa, agenda, formulário, assinatura e confirmação; ações bloqueadas continuam vinculadas às respectivas issues técnicas.

### H-UX-002 — Teclado
**Estado:** READY nas rotinas alcançáveis

**Esperado:** fluxo crítico disponível sem mouse.

### H-UX-003 — Labels/forms
**Estado:** READY

**Esperado:** labels únicos e associados aos controles.

### H-UX-004 — Contraste/legibilidade
**Estado:** READY

### H-UX-005 — Zoom/tamanho de fonte
**Estado:** READY

**Esperado:** sem perda de ação ou conteúdo importante.

### H-UX-006 — Mensagens de erro
**Estado:** READY

**Esperado:** linguagem compreensível e ação de recuperação.

---

# Fase 23 — Backup e restore

### H-BKP-001 — Backup automático configurado
**Estado:** BLOCKED na auditoria de 04/09/2026; Issue #80

**Esperado:** job/timer Solange ativo e documentado.

### H-BKP-002 — Backup gerado
**Estado:** BLOCKED; Issue #80

**Esperado:** dump íntegro, timestamp, checksum e armazenamento protegido no destino aprovado.

### H-BKP-003 — Retenção/rotação
**Estado:** BLOCKED; Issue #80

**Esperado:** retenção definida sem encher o host; exclusão segura de versões expiradas.

### H-BKP-004 — Falha do destino
**Estado:** BLOCKED; Issue #80

**Esperado:** job falha de modo visível; não declara sucesso.

### H-BKP-005 — Restore isolado
**Estado:** PARTIAL — script existe, evidência real pendente; Issue #80

Restaurar backup em ambiente isolado, nunca sobre o demo/produção.

**Esperado:** schema, migrations, RLS, tabelas críticas e contagens validadas.

### H-BKP-006 — Teste de conteúdo criptografado
**Estado:** PARTIAL; Issue #80

**Esperado:** banco restaurado sozinho não revela plaintext clínico; versões de chave são fornecidas separadamente quando necessário.

### H-BKP-007 — RPO/RTO medidos
**Estado:** BLOCKED até primeiro drill; Issue #80

Registrar idade do backup e tempo real de restauração.

### H-BKP-008 — Dados pessoais de homologação no backup
**Estado:** BLOCKED até rotina existir; Issue #80

**Esperado:** mesmos controles de acesso/retenção aplicados aos dados autorizados do testador; limpeza pós-homologação inclui cópias de backup conforme política.

---

# Fase 24 — Rollback, atualização e operação

### H-OPS-001 — Atualização do ambiente
**Estado:** READY operacional; promoção do SHA candidato rastreada na Issue #82

**Esperado:** versão implantada muda de forma controlada e registrada.

### H-OPS-002 — Smoke pós-deploy
**Estado:** READY

**Esperado:** health, login, agenda, pessoa, fila e storage privados funcionam.

### H-OPS-003 — Rollback de aplicação
**Estado:** READY conforme runbook; executar exercício

**Esperado:** voltar ao artefato anterior sem reset destrutivo de banco.

### H-OPS-004 — Migration incompatível
**Estado:** READY documental/controlado

**Esperado:** plano forward-fix/restore conhecido; nunca editar migration aplicada.

### H-OPS-005 — Observabilidade
**Estado:** READY

Validar health, worker heartbeat, filas, falhas de mensageria/fiscal e 5xx.

### H-OPS-006 — Kill switch de integração
**Estado:** READY

**Esperado:** desativar e-mail/WhatsApp/NFS-e sem derrubar o app.

---

# Fase 25 — Encerramento da rodada

### H-END-001 — Regressão completa
Reexecutar todos os casos impactados por correções.

### H-END-002 — Evidências
Anexar por caso: data, tester, SHA, resultado e evidência sanitizada.

### H-END-003 — Pendências
Todo FAIL/BLOCKED obrigatório deve possuir issue/PR ou decisão formal de N/A.

### H-END-004 — Limpeza dos dados de teste
Remover/anonimizar dados do próprio testador conforme política e preservar somente evidência necessária.

### H-END-005 — Credenciais temporárias
Confirmar inventário e rotação/remoção planejada antes do go-live.

### H-END-006 — Termo de homologação
Registrar SHA final e lista de exceções aceitas.

## Regra final

A homologação não é uma demonstração visual. Para cada rotina crítica, o teste deve provar persistência correta, autorização, auditoria, idempotência e comportamento de falha — além da interface aparente.