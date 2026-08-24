# ADR-0003 — Segurança e isolamento clínico

Status: Accepted

## Contexto

O sistema trata dados pessoais, fiscais, financeiros e dados sensíveis de saúde. Secretaria e contabilidade precisam operar o sistema sem acesso ao conteúdo clínico.

## Decisão

Adotar defesa em profundidade:

- Supabase Auth para equipe;
- MFA/AAL2 obrigatório em produção;
- RLS default-deny;
- papel `psychologist_owner` + AAL2 para conteúdo clínico;
- storage clínico privado e separado;
- audit log de acesso clínico;
- nenhuma exportação, mensagem ou log técnico com conteúdo clínico;
- dados de produção nunca usados em staging/testes.

## Capability links

Pacientes não terão conta no MVP. Formulários e ações usam token aleatório de escopo mínimo, armazenado apenas como hash, trocado por cookie HttpOnly e revogado após uso/conclusão.

## Consequências

Segurança não depende apenas da UI. Acesso direto ao banco/API continua restrito por RLS e contexto de autenticação.
