# Clinical

## Responsabilidade
Manter registros psicológicos cifrados, versionados e auditados para a psicóloga proprietária.

## Public API
`public.ts` exporta a criação de registros por envelope cifrado e seus tipos públicos, além de `completeAppointmentWithHandoff`: finaliza o atendimento salvando o registro clínico e, opcionalmente, cria uma tarefa administrativa estruturada (handoff Profissional → Secretaria) via o contrato público do módulo `tasks`. Decriptação e leitura controlada seguem disponíveis pelas tasks anteriores.

## Owns
O schema `clinical`, registros clínicos e anexos clínicos privados.

## Consumes
IDs de pessoa e atendimento por contratos públicos. Usa `SensitiveDataCrypto` da plataforma e o contrato público de auditoria. Para o handoff, consome `createTaskAndPersist` do módulo `tasks` (público) — nunca lê nem escreve diretamente no schema de tasks.

## Invariantes
Plaintext clínico nunca chega ao repositório, banco, auditoria, fila ou log. Cada registro possui UUID, contexto AAD `clinical-record:<id>`, versão de chave e autor.

## Dados sensíveis
Conteúdo clínico é L3. Só a psicóloga proprietária com perfil ativo e AAL2 poderá ler ou escrever após as tasks de leitura controlada.

## Proibições
Secretaria e contabilidade não recebem plaintext, ciphertext ou metadados clínicos. Clinical não é consumido por busca global, financeiro ou relatórios administrativos. A tarefa administrativa criada por `completeAppointmentWithHandoff` nunca recebe o plaintext clínico: seu título é sempre um de um conjunto fechado e predefinido por tipo (`schedule_follow_up`, `contact_patient`, `resend_form`, `other_admin`), nunca derivado do texto do editor clínico.
