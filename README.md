# Solange Rolla Consultório

Sistema privado para gestão de consultório, psicoterapia, eventos, formulários pré-atendimento, assinatura eletrônica simples, comunicação, financeiro e NFS-e.

> Status: planejamento arquitetural e documentação. Não usar com dados reais de pacientes antes da conclusão da fase de segurança, homologação jurídica/fiscal e checklist de produção.

## Princípio do projeto

Usar infraestrutura e componentes maduros, mas construir o domínio do consultório especificamente para a operação de Solange Rolla. Não faremos fork de ERP, sistema hospitalar ou clínica genérica.

## Stack planejada

- Next.js App Router + TypeScript
- Supabase/PostgreSQL em região específica São Paulo (`sa-east-1`)
- Supabase Auth, RLS e Storage privado
- Vercel para aplicação e previews
- GitHub Actions para CI
- WhatsApp Business Platform + e-mail transacional por adaptadores
- NFS-e Nacional/Belo Horizonte por adaptador fiscal
- Vitest + Playwright

## Documentação

- [Plano mestre](docs/PROJECT_MASTER_PLAN.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Fluxos do produto](docs/PRODUCT_FLOWS.md)
- [Modelo de dados](docs/DATA_MODEL.md)
- [Segurança e privacidade](docs/SECURITY_PRIVACY.md)
- [Jurídico, CFP e política de cobrança](docs/LEGAL_COMPLIANCE.md)
- [Integrações externas](docs/INTEGRATIONS.md)
- [Testes, deploy e operação](docs/TESTING_DEPLOYMENT.md)
- [Referências pesquisadas](docs/REFERENCES.md)
- [Especificação inicial](docs/superpowers/specs/2026-08-24-solange-rolla-consultorio-design.md)
- [Plano de implementação](docs/superpowers/plans/2026-08-24-solange-rolla-consultorio-implementation.md)

## Fluxos principais

### Consulta

Pessoa → agendamento → formulário/termo → assinatura → confirmação → atendimento → recebimento → NFS-e.

### Evento

Evento → inscrição → cadastro da pessoa → formulário/termo quando aplicável → pagamento → presença → NFS-e → resultado financeiro.

## Regras de negócio já aprovadas

- Cadastro único de Pessoa, reutilizado por paciente, participante e responsável financeiro.
- Dados necessários à NFS-e fazem parte do cadastro fiscal.
- Data de nascimento alimenta felicitação automática, respeitando preferência de comunicação.
- Formulário pré-consulta é obrigatório quando configurado e deve ser enviado por WhatsApp ou e-mail.
- Assinatura deve ser simples para o paciente, com forte trilha técnica nos bastidores.
- Confirmação é enviada 24h antes, com Confirmar, Solicitar reagendamento e Cancelar.
- Reagendamento é tratado pela secretaria; o paciente não escolhe novo horário diretamente.
- Cancelamento sem cobrança usa 48 horas computáveis; sábado e domingo não contam.
- A política de cobrança deve aparecer no contrato/formulário assinado e novamente na mensagem de confirmação.
- Agenda, financeiro e fiscal possuem estados independentes.
- Secretaria não acessa conteúdo clínico.

## Regra para agentes e desenvolvedores

Antes de implementar qualquer módulo, ler `AGENTS.md`, `docs/PROJECT_MASTER_PLAN.md` e o documento específico da área. Alterações de segurança, privacidade, fiscal, cobrança ou acesso clínico exigem testes negativos e atualização da documentação correspondente.
