# Product Flows

## 1. Cadastro de Pessoa

1. Secretaria/profissional pesquisa por CPF, telefone e e-mail.
2. Se não existir, cria Pessoa.
3. Captura identificação, nascimento, contato, endereço e dados fiscais.
4. Define responsável legal/financeiro quando necessário.
5. Define canal preferido e preferências de comunicação.
6. Nenhum campo clínico faz parte do cadastro administrativo.

## 2. Agendamento de consulta

1. Selecionar Pessoa.
2. Selecionar serviço, data, horário, duração e valor.
3. Sistema calcula e persiste deadline de cancelamento conforme policy version.
4. Sistema cria recebível previsto conforme regra configurada.
5. Se formulário for obrigatório, cria acesso capability para pré-atendimento.
6. Automations agenda confirmação e demais avisos.

## 3. Pré-atendimento

1. Paciente recebe link por WhatsApp/e-mail.
2. Link é trocado por sessão pública restrita.
3. Paciente preenche, salva e pode continuar depois.
4. Tela final exibe condições, incluindo política de cobrança/cancelamento.
5. Paciente declara veracidade das informações.
6. Assina digitando nome ou desenhando assinatura.
7. Sistema congela conteúdo, gera hash/PDF/evidência e revoga capacidade de edição.
8. Agenda passa a mostrar formulário/assinatura concluídos.

## 4. Confirmação 24h antes

Mensagem contém data/hora e aviso da política previamente aceita.

Ações:
- **Confirmar** -> `confirmed`.
- **Solicitar reagendamento** -> `reschedule_requested` + tarefa para secretaria.
- **Cancelar** -> sistema verifica deadline e classifica `cancelled_in_time` ou `cancelled_late`.

A confirmação não muda automaticamente o financeiro.

## 5. Reagendamento

1. Paciente solicita.
2. Secretaria recebe pendência.
3. Secretaria entra em contato.
4. Novo horário é criado/associado preservando histórico do original.
5. Política/deadline do novo horário é calculada conforme regra aplicável.

## 6. Falta

1. Após horário, profissional/secretaria registra `no_show`.
2. Financeiro avalia regra configurada da consulta.
3. Se cobrança aplicável, recebível permanece/torna-se devido.
4. Exceção manual exige motivo e audit log.

## 7. Atendimento realizado

1. Consulta -> `completed`.
2. Psicóloga pode criar registro clínico associado.
3. Registro clínico só é acessível à psicóloga com MFA.
4. Recebível segue ciclo independente.

## 8. Pagamento

1. Abrir recebível.
2. Registrar data, valor e forma.
3. Permitir múltiplos pagamentos/parcialidade.
4. Atualizar saldo/status financeiro.
5. Criar audit event.
6. Enfileirar ação fiscal somente se regra fiscal indicar.

## 9. Contas a pagar

1. Cadastrar fornecedor/categoria/valor/vencimento.
2. Opcionalmente configurar recorrência.
3. Sistema cria ocorrências futuras de modo idempotente.
4. Registrar pagamento e comprovante privado.
5. Fluxo de caixa separa realizado e previsto.

## 10. Evento

1. Criar evento com data, local/modalidade, capacidade e valor.
2. Abrir inscrições.
3. Participante usa Pessoa existente ou cria nova.
4. Registration mantém status e financeiro próprios.
5. Formulário/assinatura pode ser exigido por tipo de evento.
6. No dia, lista de presença registra comparecimento.
7. Despesas podem ser vinculadas ao evento.
8. Dashboard calcula receita, custo e resultado.

## 11. NFS-e

1. Fiscal recebe comando idempotente.
2. Valida tomador e dados necessários.
3. Chama provider em sandbox/live conforme feature flag.
4. Persiste protocolo/status.
5. Consulta resultado assíncrono se necessário.
6. Armazena XML/PDF em bucket privado.
7. Enfileira comunicação ao cliente sem conteúdo clínico.
8. Cancelamento/substituição preservam histórico.

## 12. Aniversário

1. Cron identifica Pessoas cujo aniversário corresponde ao dia em `America/Sao_Paulo`.
2. Filtra preferências/opt-out.
3. Enfileira mensagem neutra no canal preferido.
4. Idempotency key impede duplicidade anual.

## 13. Dashboard Atenção Hoje

Itens mínimos:
- consulta sem confirmação;
- formulário/assinatura pendente;
- reagendamento solicitado;
- recebível vencido;
- conta a pagar vencendo/vencida;
- NFS-e pendente/falha;
- fila externa com falha terminal;
- aniversários do dia/semana.

Dashboard nunca mostra conteúdo clínico.
