# Solange Rolla Consultório

Sistema privado para gestão de consultório, psicoterapia, eventos, formulários pré-atendimento, assinatura eletrônica simples, comunicação, financeiro e NFS-e.

> Status: **arquitetura v2 em revisão**. Não usar com dados reais de pacientes antes da conclusão da segurança, homologação jurídica/fiscal e checklist de produção.

## Direção técnica

Usar infraestrutura e componentes maduros, mas construir o domínio do consultório especificamente para a operação de Solange Rolla. Não faremos fork de ERP, sistema hospitalar ou clínica genérica.

Arquitetura: **monólito modular orientado a domínio**, PostgreSQL/Supabase como fonte de verdade e filas duráveis para integrações assíncronas.

## Stack planejada

- Next.js App Router + TypeScript
- Supabase/PostgreSQL em região específica São Paulo (`sa-east-1`)
- Supabase Auth, MFA, RLS, Storage, Queues e Cron
- Supabase Edge Functions como runtime inicial de workers
- Vercel para aplicação e previews
- GitHub Actions para CI
- WhatsApp Business Platform + e-mail transacional por adaptadores
- NFS-e por adapter isolado e ambiente de homologação
- Vitest + Playwright

## Comece por aqui — agentes/desenvolvedores

1. [AGENTS.md](AGENTS.md)
2. [Arquitetura oficial](docs/ARCHITECTURE.md)
3. [Modelo operacional multiagente](docs/AGENT_OPERATING_MODEL.md)
4. [Module Boundaries](docs/MODULE_BOUNDARIES.md)
5. [Definition of Done](docs/DEFINITION_OF_DONE.md)
6. [ADRs](docs/adr/)
7. Issue/Task Contract da tarefa

## Documentação do projeto

- [Plano mestre](docs/PROJECT_MASTER_PLAN.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Fluxos do produto](docs/PRODUCT_FLOWS.md)
- [Modelo de dados](docs/DATA_MODEL.md)
- [Segurança e privacidade](docs/SECURITY_PRIVACY.md)
- [Jurídico, CFP e política de cobrança](docs/LEGAL_COMPLIANCE.md)
- [Integrações externas](docs/INTEGRATIONS.md)
- [Testes, deploy e operação](docs/TESTING_DEPLOYMENT.md)
- [Referências pesquisadas](docs/REFERENCES.md)
- [Spec arquitetura multiagente v2](docs/superpowers/specs/2026-08-24-multiagent-architecture-design.md)
- [Spec funcional inicial](docs/superpowers/specs/2026-08-24-solange-rolla-consultorio-design.md)
- [Plano de implementação v1](docs/superpowers/plans/2026-08-24-solange-rolla-consultorio-implementation.md) — será regenerado após aprovação da arquitetura v2.

## Fluxos principais

### Consulta

Pessoa → agendamento → formulário/termo → assinatura → confirmação → atendimento → recebimento → NFS-e.

### Evento

Evento → inscrição → cadastro da pessoa → formulário/termo quando aplicável → pagamento → presença → NFS-e → resultado financeiro.

## Regras de negócio já aprovadas

- Cadastro único de Pessoa, reutilizado por paciente, participante e responsável financeiro.
- Dados necessários à NFS-e fazem parte do cadastro fiscal.
- Data de nascimento alimenta felicitação automática, respeitando preferência de comunicação.
- Formulário pré-consulta é obrigatório quando configurado e pode ser enviado por WhatsApp/e-mail.
- Assinatura deve ser simples para o paciente, com forte trilha técnica nos bastidores.
- Confirmação é enviada 24h antes, com Confirmar, Solicitar reagendamento e Cancelar.
- Reagendamento é tratado pela secretaria; o paciente não escolhe novo horário diretamente.
- Cancelamento sem cobrança usa 48 horas computáveis; sábado e domingo não contam.
- Política de cobrança aparece no termo/formulário assinado e na confirmação.
- Agenda, financeiro e fiscal possuem estados independentes.
- Secretaria/contabilidade não acessam conteúdo clínico.

## Regra de execução

Uma task = uma Issue Task Contract = uma branch/worktree = um PR. Alterações de contratos públicos, RLS, clínico, fiscal, dinheiro/tempo ou políticas históricas exigem ADR/revisão arquitetural.
