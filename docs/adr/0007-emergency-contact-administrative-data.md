# ADR 0007 — Contato de emergência como dado administrativo opcional

**Status:** aceito para o desenho do produto; uso com dados reais segue o gate de privacidade do go-live.

## Contexto

O produto precisa representar um contato de emergência sem transformar terceiros em pacientes, sem misturar o dado com prontuário clínico e sem expô-lo a perfis que não operam o cadastro do paciente.

## Decisão

- Manter um único contato de emergência opcional diretamente em `public.people`: nome e telefone são o par mínimo; vínculo é opcional.
- Não criar automaticamente `person_relationships`: o contato pode não ser uma pessoa cadastrada no consultório.
- Finalidade de produto: apoio operacional excepcional relacionado ao paciente. O sistema não dispara mensagens nem aciona o contato automaticamente.
- A UI expõe o dado apenas nos fluxos administrativos de Pacientes. Ele não é propagado automaticamente para agenda, financeiro, fiscal, formulários ou conteúdo clínico.
- O acesso continua submetido a `patients.read`/`patients.update`; no banco, `people` permanece restrito a `psychologist_owner` e `secretary`. A visão contábil não contém os campos de emergência.
- O dado segue a classe L2 do inventário administrativo e a política geral de retenção/solicitação do titular. Não há hard-delete automático específico.
- Criação e atualização são auditadas sem copiar PII para `audit_events`. Atualizações registram apenas categorias booleanas de alteração, incluindo `emergencyContactChanged`.

## Privacidade e go-live

Esta ADR decide o comportamento do produto, não substitui validação jurídica. Antes de coletar dados reais em produção, o registro de operações e o aviso de privacidade devem documentar a finalidade concreta, a base legal aplicável, a transparência devida ao terceiro, retenção e procedimento de atendimento a direitos. Enquanto esse gate não estiver aprovado, o recurso deve permanecer restrito a homologação/dados sintéticos.

## Consequências

- O contato de emergência permanece separado do prontuário e de dados clínicos.
- Contabilidade não recebe o dado por `accounting_people_view`.
- Mudanças são rastreáveis por ator sem registrar nome, telefone ou vínculo no log de auditoria.
- Uma futura necessidade de múltiplos contatos ou contatos reutilizáveis exige nova decisão e migração própria; não deve ser inferida desta ADR.
