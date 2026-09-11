# Planos de implementação

## Plano operacional atual — 2026-09-11

A recuperação operacional aprovada deve ser executada a partir de:

- `2026-09-11-00-solange-end-to-end-execution-index.md`

Esse índice é a fonte de ordem, dependências e gates para transformar o sistema atual em uma operação completa de consultório, com **Administradora, Secretaria e Profissional** como personas de validação.

Subplanos atuais:

- `2026-09-11-01-users-access-control.md` — usuários, perfil-base e permissões por rotina;
- `2026-09-11-02-patient-360.md` — Paciente 360°, cadastro e navegação;
- `2026-09-11-03-agenda-appointments.md` — Agenda profissional completa;
- `2026-09-11-04-care-clinical-history.md` — atendimento e prontuário longitudinal;
- `2026-09-11-05-collaboration-dashboard-integrations.md` — handoff, dashboards e integrações contextuais;
- `2026-09-11-06-validation-release.md` — validação, homologação visível e release.

Documentos complementares obrigatórios:

- `../specs/2026-09-11-solange-end-to-end-operational-design.md`;
- `../../AGENT_EXECUTION_WORKFLOW.md`;
- `../../CODEX_DISPATCH.md`;
- `../../homologacao/2026-09-11-end-to-end-acceptance-matrix.md`.

## Planos base v2 — 2026-08-24

Os planos abaixo continuam válidos como fundação histórica/técnica. O programa 2026-09-11 **não reescreve a arquitetura**; ele recupera fluxos incompletos e integra a experiência operacional. Quando houver conflito de execução entre um plano antigo e a spec operacional 2026-09-11, prevalece a spec atual sem violar `AGENTS.md`, `docs/ARCHITECTURE.md` e ADRs vigentes.

- `2026-08-24-00-execution-index.md`
- `2026-08-24-01-foundation-platform.md`
- `2026-08-24-01a-platform-provisioning.md`
- `2026-08-24-01b-ui-foundation.md`
- `2026-08-24-01c-architecture-enforcement.md`
- `2026-08-24-01d-environments-preview.md`
- `2026-08-24-02-identity-people.md`
- `2026-08-24-02b-sensitive-data-security.md`
- `2026-08-24-03-appointments-forms-signatures.md`
- `2026-08-24-03a-contract-terms.md`
- `2026-08-24-03b-signed-documents.md`
- `2026-08-24-03c-public-edge-security.md`
- `2026-08-24-04-messaging-automations.md`
- `2026-08-24-05-finance-events.md`
- `2026-08-24-06-fiscal.md`
- `2026-08-24-06b-clinical.md`
- `2026-08-24-07-reports-hardening-release.md`

## Plano legado

`2026-08-24-solange-rolla-consultorio-implementation.md` é **v1 / superseded**. Não deve ser executado como fonte principal.
