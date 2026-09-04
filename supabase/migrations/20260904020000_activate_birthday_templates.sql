-- owners: messaging
-- task-contract: docs/task-contracts/birthday-automation.json
-- allow-static-routines: true

update public.message_templates
set active = true
where key = 'birthday_greeting' and version = 1 and channel in ('whatsapp', 'email');
