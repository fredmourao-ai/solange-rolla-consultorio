# Forms

## Responsabilidade

Gerenciar templates versionados, submissões e respostas pré-atendimento.

## Owns

O módulo possui templates, versões e submissões de formulários.

## Consumes

Consome IDs de appointments e capabilities e a porta pública de criptografia
da plataforma.

## Public API

O contrato público está em public.ts. Outros módulos não importam internals de
forms.

## Invariantes

- Submissões mantêm a versão do template iniciada.
- Templates sensíveis são cifrados no servidor antes da persistência.
- Submissões assinadas são imutáveis e correções criam nova versão.

## Dados sensíveis

Respostas sensíveis são L3 e nunca entram em claro no repository, logs, cache
persistente, mensagens ou relatórios.

## Proibições

- Não enviar respostas clínicas por WhatsApp ou e-mail.
- Não listar pacientes através de capability de preenchimento.
- Não importar infrastructure de appointments ou signatures.
