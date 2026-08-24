# Solange Rolla Consultorio - Design

## Objetivo
Sistema privado para gestao de consultorio e eventos, com cadastro unico de pessoas, agenda, formularios pre-atendimento, assinatura simples com trilha de evidencias, comunicacao por WhatsApp/email, financeiro, NFS-e e area clinica segregada.

## Arquitetura
- Frontend/API: Next.js + TypeScript
- Dados/Auth/Storage: Supabase/PostgreSQL
- Hosting: Vercel
- Repositorio: GitHub privado
- Comunicacao: WhatsApp Business Platform + email transacional
- Fiscal: camada desacoplada para NFS-e

## Modulos
1. Autenticacao, perfis e auditoria
2. Cadastro unico de pessoas e dados fiscais
3. Agenda de consultas
4. Politica de cancelamento: 48 horas computaveis, sabado e domingo excluidos
5. Formularios versionados e assinatura simples
6. Confirmacao 24h antes por WhatsApp/email
7. Reagendamento via secretaria
8. Contas a receber e pagamentos
9. Contas a pagar e fluxo de caixa
10. Eventos, participantes, pagamentos e agenda de eventos
11. NFS-e
12. Aniversarios e automacoes
13. Area clinica protegida
14. Dashboards e relatorios

## Regras essenciais
- Paciente e participante compartilham o mesmo cadastro de Pessoa.
- Secretaria nao acessa conteudo clinico.
- Formulario assinado torna-se imutavel e gera nova versao em caso de alteracao.
- Politica de cobranca deve estar no formulario/contrato e na confirmacao da consulta.
- Cancelamento dentro do prazo nao gera cobranca; fora do prazo e falta podem gerar cobranca, com isencao manual justificada.
- Sabados e domingos nao entram no calculo das 48 horas.
- Confirmacao 24h antes oferece Confirmar, Solicitar reagendamento e Cancelar.
- NFS-e e financeiro sao desacoplados da agenda por estados independentes.

## Seguranca
- MFA administrativo
- RLS no banco
- storage privado
- logs de auditoria
- segregacao entre dados administrativos e clinicos
- backups e testes de restauracao
