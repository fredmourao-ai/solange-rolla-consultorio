-- owners: messaging
-- task-contract: docs/task-contracts/birthday-automation.json
-- allow-static-routines: true

update public.message_templates
set body = case channel
    when 'whatsapp' then 'Olá, {{preferredName}}! Passando para desejar um feliz aniversário.'
    when 'email' then E'Olá, {{preferredName}}!\n\nPassando para desejar um feliz aniversário.'
    else body
  end,
  active = true
where key = 'birthday_greeting'
  and version = 1
  and channel in ('whatsapp', 'email');
