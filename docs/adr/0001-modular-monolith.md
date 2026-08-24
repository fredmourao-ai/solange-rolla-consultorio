# ADR-0001 — Monólito modular

Status: Accepted

## Contexto

O sistema possui vários domínios (agenda, formulários, financeiro, eventos, fiscal e clínico), mas volume inicial não justifica microserviços. Vários agentes precisam trabalhar em paralelo com baixo risco de conflito.

## Decisão

Usar um único deploy principal Next.js com módulos de domínio fortemente isolados e processamento assíncrono separado por filas/workers.

Módulos expõem apenas contratos públicos (`public.ts`). Não há import de internals de outro módulo.

## Consequências positivas

- transações simples;
- menor superfície operacional e de segurança;
- CI/CD mais simples;
- agentes trabalham por módulo;
- extração futura continua possível.

## Consequências negativas

- disciplina de fronteiras precisa ser aplicada por lint/review/testes;
- deploy do web continua único até existir motivo real de extração.

## Gatilhos para revisão

Escala independente comprovada, isolamento regulatório adicional, incompatibilidade de runtime ou equipe independente com cadência própria.
