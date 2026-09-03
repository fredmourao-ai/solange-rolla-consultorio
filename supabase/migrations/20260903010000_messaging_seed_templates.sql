-- owners: messaging
-- task-contract: docs/task-contracts/messaging-templates-seed.json
-- allow-static-routines: true

-- Real (production) template content for the messaging providers, distinct
-- from supabase/seed.sql's synthetic demo fixtures: a message template is
-- reference/operational data that also has to exist in production, not
-- something to reset on every local seed. version=1, active=true for each
-- key+channel this project already sends today (appointment confirmation);
-- the remaining keys are seeded inactive as a documented starting point
-- for review, matching AGENTS.md's "GO_LIVE_CHECKLIST: templates WhatsApp/
-- e-mail revisados" step -- this migration does not itself declare them
-- production-ready.
--
-- Tokens used per key/channel match ALLOWED_TOKENS_BY_KEY in
-- src/modules/messaging/infrastructure/supabase-template-repository.ts;
-- keep both in sync if either changes.

insert into public.message_templates (key, channel, version, body, active) values
  ('appointment_confirmation', 'whatsapp', 1,
   'Olá, {{preferredName}}! Sua consulta com Solange Rolla está marcada para {{appointmentDate}} às {{appointmentTime}}. Confirme, cancele ou peça reagendamento (sujeito à política de cancelamento vigente): {{secureLink}}',
   true),
  ('appointment_confirmation', 'email', 1,
   'Olá, {{preferredName}}!\n\nSua consulta com Solange Rolla está marcada para {{appointmentDate}} às {{appointmentTime}}.\n\nConfirme, cancele ou peça reagendamento (sujeito à política de cancelamento vigente) neste link: {{secureLink}}',
   true),

  ('appointment_cancelled', 'whatsapp', 1,
   'Olá, {{preferredName}}. Sua consulta de {{appointmentDate}} às {{appointmentTime}} foi cancelada. Qualquer dúvida, fale com a secretaria.',
   false),
  ('appointment_cancelled', 'email', 1,
   'Olá, {{preferredName}}.\n\nSua consulta de {{appointmentDate}} às {{appointmentTime}} foi cancelada. Qualquer dúvida, fale com a secretaria.',
   false),

  ('reschedule_received', 'whatsapp', 1,
   'Olá, {{preferredName}}. Recebemos seu pedido de reagendamento da consulta de {{appointmentDate}} às {{appointmentTime}}. A secretaria vai propor um novo horário em breve.',
   false),
  ('reschedule_received', 'email', 1,
   'Olá, {{preferredName}}.\n\nRecebemos seu pedido de reagendamento da consulta de {{appointmentDate}} às {{appointmentTime}}. A secretaria vai propor um novo horário em breve.',
   false),

  ('payment_admin_reminder', 'whatsapp', 1,
   'Olá, {{preferredName}}. Lembrete administrativo: há um pagamento pendente com vencimento em {{deadlineDate}} às {{deadlineTime}}.',
   false),
  ('payment_admin_reminder', 'email', 1,
   'Olá, {{preferredName}}.\n\nLembrete administrativo: há um pagamento pendente com vencimento em {{deadlineDate}} às {{deadlineTime}}.',
   false),

  ('event_reminder', 'whatsapp', 1,
   'Olá, {{preferredName}}! Lembrete: o evento está marcado para {{appointmentDate}} às {{appointmentTime}}.',
   false),
  ('event_reminder', 'email', 1,
   'Olá, {{preferredName}}!\n\nLembrete: o evento está marcado para {{appointmentDate}} às {{appointmentTime}}.',
   false),

  ('birthday_greeting', 'whatsapp', 1,
   'Olá, {{preferredName}}! Passando para desejar um feliz aniversário. 🎉',
   false),
  ('birthday_greeting', 'email', 1,
   'Olá, {{preferredName}}!\n\nPassando para desejar um feliz aniversário.',
   false),

  ('form_link', 'whatsapp', 1,
   'Olá, {{preferredName}}! Segue o link para preencher seu formulário pré-consulta: {{secureLink}}',
   false),
  ('form_link', 'email', 1,
   'Olá, {{preferredName}}!\n\nSegue o link para preencher seu formulário pré-consulta: {{secureLink}}',
   false),

  ('fiscal_document_ready', 'whatsapp', 1,
   'Olá, {{preferredName}}! Seu documento fiscal está disponível: {{secureLink}}',
   false),
  ('fiscal_document_ready', 'email', 1,
   'Olá, {{preferredName}}!\n\nSeu documento fiscal está disponível: {{secureLink}}',
   false)
on conflict (key, channel, version) do nothing;
