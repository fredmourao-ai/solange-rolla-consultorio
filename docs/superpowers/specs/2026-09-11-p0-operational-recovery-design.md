# P0 Operational Recovery — Pacientes, Agenda e Atendimento/Prontuário

**Status:** aprovado em conversa para execução urgente
**Data:** 2026-09-11
**Issue:** #113

## Objetivo

Transformar o sistema atual, que possui módulos tecnicamente implementados porém fragmentados na experiência do usuário, em uma jornada operacional coerente e utilizável no consultório, preservando a arquitetura oficial do projeto e as regras de negócio já aprovadas.

A recuperação P0 não reescreve o produto nem troca a stack. Ela integra e completa os fluxos existentes de Pacientes, Agenda e Clínico, corrige a navegação e cria um caminho operacional explícito do agendamento ao registro da sessão.

## Restrições não negociáveis

- Manter monólito modular Next.js + TypeScript + Supabase/PostgreSQL.
- Manter módulos de domínio e contratos públicos existentes; não introduzir microserviços, RabbitMQ, Kong, PHP/Swoole ou Kubernetes.
- Manter cadastro único interno de `people`, mas a UX principal do consultório deve usar a palavra **Pacientes**.
- Dados administrativos e clínicos permanecem segregados.
- Conteúdo clínico somente para `psychologist_owner` com AAL2/MFA e regras RLS existentes.
- Secretaria/contabilidade não recebem conteúdo clínico.
- Registros clínicos permanecem imutáveis/versionados; correção cria nova versão, sem edição destrutiva silenciosa.
- Agenda, financeiro e fiscal mantêm estados independentes.
- Integrações externas permanecem assíncronas, idempotentes e auditáveis.
- Nenhum dado real de paciente em testes, fixtures, logs, issues ou screenshots de homologação.
- Linguagem da UI deve ser simples, operacional e não técnica; IDs/UUIDs, nomes de tabelas e códigos internos não devem aparecer como entrada manual do usuário quando o contexto já os conhece.
- Validação final deve incluir uso real da UI visível, além de testes automatizados.

## Problemas confirmados no estado atual

1. A sidebar pode ultrapassar a altura da viewport sem rolagem independente, tornando itens inferiores inacessíveis.
2. A UI expõe **Pessoas**, apesar de o principal caso de uso operacional ser paciente.
3. O cadastro inicial possui dados básicos e fiscais, mas a tela de gerenciamento não permite editar os dados cadastrais fundamentais; ela se limita majoritariamente a comunicação e vínculos.
4. Não existe uma ficha central do paciente que reúna cadastro, agenda, histórico, formulários, documentos e situação financeira.
5. A Agenda possui visualização Dia/Semana/Mês, porém a criação/edição de consultas está escondida em `/agenda/gerenciar`, fazendo a funcionalidade parecer ausente.
6. O registro clínico solicita manualmente `appointment_id`, embora o sistema já possa saber qual consulta está sendo atendida.
7. A timeline clínica mostra essencialmente metadados/IDs e não entrega uma experiência longitudinal de leitura e continuidade do atendimento.
8. O fluxo operacional `consulta -> atendimento -> evolução -> conclusão -> financeiro` não está apresentado como uma jornada única para a profissional.

## Jornada-alvo P0

### 1. Pacientes

A navegação principal exibe **Pacientes**. A rota interna `/pessoas` pode permanecer por compatibilidade.

A lista de pacientes deve permitir:
- busca por nome civil/preferido, CPF, telefone e e-mail;
- acesso evidente à ficha do paciente;
- criação de novo paciente;
- indicação de próxima consulta quando existir;
- indicação de cadastro fiscal incompleto sem expor termos técnicos.

### 2. Ficha 360° do paciente

A ficha do paciente é o centro operacional e deve conter, em abas/seções coerentes:
- **Resumo:** nome, idade, contatos, próxima consulta, alertas administrativos e ações rápidas;
- **Cadastro:** edição real de nome civil, nome preferido, nascimento, CPF, telefone, e-mail e endereço fiscal;
- **Responsáveis e vínculos:** responsável legal, financeiro e tomador fiscal;
- **Consultas:** próximas e anteriores, com criação/reagendamento quando autorizado;
- **Prontuário:** somente para psicóloga AAL2, com histórico longitudinal e criação de evolução vinculada à consulta;
- **Formulários/documentos:** formulários pré-atendimento, termos/documentos assinados e anexos permitidos;
- **Financeiro/fiscal:** resumo de recebíveis, pagamentos e NFS-e, sem conteúdo clínico;
- **Comunicação:** preferências e histórico administrativo permitido.

A ficha não mistura conteúdo clínico em campos administrativos.

### 3. Cadastro e edição do paciente

O formulário administrativo deve ser organizado por seções e reutilizável entre criação e edição.

Campos P0:
- nome civil;
- nome preferido/social quando aplicável;
- data de nascimento;
- CPF;
- telefone/WhatsApp;
- e-mail;
- endereço fiscal: logradouro, número, complemento, bairro, cidade, UF e CEP;
- canal preferido;
- preferência de mensagem de aniversário;
- vínculos de responsável legal/financeiro/tomador fiscal.

O backend continua utilizando normalização e deduplicação existentes. O formulário de edição deve carregar valores atuais, validar, persistir e retornar à ficha mostrando o resultado atualizado.

### 4. Agenda

A Agenda continua com Dia/Semana/Mês, mas passa a apresentar claramente:
- botão **Nova consulta** no cabeçalho;
- ação de criar consulta a partir da agenda;
- seleção de paciente, serviço, data/hora;
- edição e reagendamento acessíveis a partir do evento;
- estados em linguagem compreensível;
- ações de confirmar, cancelar, falta e concluir conforme transições autorizadas;
- bloqueio de conflitos e preservação da política de cancelamento versionada.

A rota `/agenda/gerenciar` pode continuar como compatibilidade/admin, mas não pode ser o único caminho para a funcionalidade.

### 5. Atendimento

Uma consulta elegível apresenta **Iniciar atendimento** para a psicóloga.

Ao iniciar:
- o sistema já conhece `person_id` e `appointment_id`;
- nenhum UUID é solicitado manualmente;
- a tela mostra cabeçalho do paciente, data/horário e contexto da consulta;
- disponibiliza histórico clínico permitido e formulário de nova evolução;
- permite salvar rascunho apenas se houver uma política segura específica; o registro final permanece versionado/imutável;
- ao finalizar, a consulta muda para o estado de conclusão permitido e o fluxo financeiro segue suas regras independentes.

### 6. Prontuário longitudinal

A timeline deixa de mostrar somente IDs e passa a apresentar registros por data/atendimento, com leitura segura do conteúdo autorizado no servidor.

Requisitos:
- descriptografia somente server-side após autorização e auditoria;
- não cachear plaintext clínico;
- nenhuma exposição a secretaria/contabilidade;
- exibir contexto humano (data, serviço/consulta, autor quando apropriado) em vez de UUIDs;
- correções geram nova versão ligada à anterior;
- acesso/leitura continua auditado.

### 7. Integrações adjacentes P0

Sem reimplementar módulos inteiros, a ficha/consulta deve apresentar links e estados úteis para:
- formulário/termo pré-atendimento configurado;
- confirmação/reagendamento/cancelamento;
- recebível associado;
- pagamento;
- NFS-e;
- mensagens administrativas relacionadas.

O objetivo é eliminar navegação por módulos técnicos para tarefas comuns.

## UX e navegação

- Sidebar desktop com altura máxima da viewport (`100dvh`) e área de navegação rolável independente.
- Cabeçalho/branding permanece visível de forma consistente sem impedir o scroll.
- `Pessoas` vira `Pacientes` na navegação e nas telas de uso clínico/administrativo principal; nomes internos/rotas podem permanecer.
- Ações primárias ficam visíveis no contexto: `Novo paciente`, `Nova consulta`, `Iniciar atendimento`, `Editar cadastro`.
- Estados vazios explicam o próximo passo e oferecem ação quando aplicável.
- Não mostrar códigos como `scheduled`, `psychologist_owner`, IDs ou nomes de erros técnicos para o usuário.
- Responsividade deve funcionar em 1366×768 e tamanhos móveis suportados.

## Segurança e privacidade

- Preservar RLS default-deny e AAL2 para clínico.
- Não mover informações clínicas para `people`.
- Não usar histórico clínico como score comercial/fila de espera automática.
- Não armazenar áudio/transcrição de IA como parte deste P0.
- Não introduzir blockchain ou mecanismos paralelos de auditoria.
- Dados clínicos continuam cifrados em AES-256-GCM no modelo atual.

## Fora do P0, mas preservado no roadmap

- fila de espera automática;
- check-in/sala de espera;
- teleatendimento;
- portal do paciente expandido;
- IA/Scribe com consentimento, minimização e revisão profissional;
- interoperabilidade FHIR/RNDS somente quando houver caso de uso/credenciamento;
- recursos médicos como TISS/TUSS, prescrição e estoque somente se o produto realmente expandir para Medicina.

## Critérios de aceitação P0

1. Sidebar rola independentemente em 1366×768 e todos os itens são alcançáveis.
2. Usuário encontra **Pacientes** sem o rótulo operacional `Pessoas`.
3. Um paciente sintético pode ser criado e depois ter seus dados cadastrais reabertos, editados, salvos e relidos pela UI.
4. A ficha do paciente centraliza resumo, cadastro, consultas e acessos condicionais a clínico/formulários/financeiro.
5. Uma consulta sintética pode ser criada diretamente da Agenda, editada/reagendada e visualizada no paciente.
6. A psicóloga AAL2 pode iniciar atendimento a partir da consulta sem digitar IDs.
7. O histórico clínico mostra registros anteriores em linguagem humana e permite registrar nova evolução vinculada ao atendimento atual.
8. Usuários sem autorização não recebem conteúdo/metadata clínica indevida.
9. Concluir a sessão preserva as regras de agenda e permite continuidade do fluxo financeiro sem acoplamento indevido.
10. Testes focalizados, lint, typecheck, suíte unitária, DB/RLS, E2E e build passam.
11. Após deploy no ambiente de homologação, os fluxos acima são repetidos pela UI visível com dados sintéticos e persistência confirmada.

## Estratégia de implementação

A execução será dividida em tarefas testáveis, mantendo cada mudança revisável e evitando reescrita ampla:
1. navegação/sidebar e nomenclatura;
2. formulário reutilizável de paciente + edição real;
3. ficha 360° e read model administrativo;
4. agenda com ações primárias e criação/reagendamento contextual;
5. workspace de atendimento com vínculo automático à consulta;
6. leitura longitudinal segura do prontuário;
7. integração contextual de formulários/financeiro/fiscal;
8. regressão, segurança e homologação de UI.
