# Credenciais Temporárias — Rotação Obrigatória Antes da Produção

Nenhum valor de credencial está registrado neste documento. Ele existe apenas
para listar, por integração, qual credencial temporária está configurada no
ambiente de demonstração/teste do Solange Rolla, sua origem, sua finalidade e
a ação exigida antes do go-live real (`docs/operations/GO_LIVE_CHECKLIST.md`).

Nenhuma dessas credenciais temporárias deve ser usada com dados reais de
paciente, e nenhuma deve continuar configurada além do encerramento da
demonstração/homologação.

| Integração | Situação atual | Origem | Finalidade no ambiente atual | Ação antes da produção Solange |
| --- | --- | --- | --- | --- |
| E-mail (SMTP) | Credencial temporária do Shop Vivaliz (Gmail SMTP) | Projeto Shop Vivaliz, `EMAIL_SMTP_HOST`/`EMAIL_SMTP_USER`/`EMAIL_SMTP_PASSWORD` já configurados naquele ambiente | Validar envio real de e-mail administrativo (confirmação de consulta) pelo worker de mensageria | Substituir por caixa de e-mail própria da Solange Rolla, com domínio/remetente próprios; revogar o uso da credencial Shop Vivaliz neste projeto |
| WhatsApp Business Cloud API | **Não disponível** — nenhuma credencial (`WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`) encontrada em nenhum ambiente acessível, incluindo Shop Vivaliz | — | — | Criar conta Meta Business Manager própria da Solange Rolla, verificar número de telefone comercial, obter token de acesso e phone_number_id; **além disso**, registrar e aprovar um template de mensagem para confirmação de consulta (mensagens iniciadas pelo negócio fora da janela de 24h exigem template aprovado, não texto livre — ver `src/modules/messaging/infrastructure/fetch-whatsapp-transport.ts`) |
| NFS-e | Não avaliado nesta rodada (fora do escopo desta auditoria) | — | — | Ver `docs/operations/GO_LIVE_CHECKLIST.md`, seção Jurídico e fiscal |

## Por que o e-mail pôde ser validado e o WhatsApp não

O texto autorizando o uso de credenciais do Shop Vivaliz ("se tecnicamente
compatíveis") pressupõe que a credencial exista e seja tecnicamente
compatível. Verificação real no ambiente do Shop Vivaliz confirmou:

- Credenciais SMTP (Gmail) existem e são compatíveis com o adapter de e-mail
  implementado (`src/modules/messaging/infrastructure/smtp-email-transport.ts`).
- Nenhuma credencial de WhatsApp Business existe em nenhum ambiente
  acessível. Não é um bloqueio de código — é a ausência real da credencial em
  qualquer sistema alcançável por esta sessão.

## Regra permanente

Nunca imprimir, commitar ou logar o valor de nenhuma credencial listada
acima. Este documento registra apenas nome da integração, origem e ação —
nunca o segredo em si.
