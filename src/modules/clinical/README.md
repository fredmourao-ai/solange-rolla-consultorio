# Clinical

## Responsabilidade
Manter registros psicológicos cifrados, versionados e auditados para a psicóloga proprietária.

## Public API
`public.ts` exporta a criação de registros por envelope cifrado e seus tipos públicos. Decriptação e leitura controlada serão adicionadas nas tasks seguintes.

## Owns
O schema `clinical`, registros clínicos e anexos clínicos privados.

## Consumes
IDs de pessoa e atendimento por contratos públicos. Usa `SensitiveDataCrypto` da plataforma e o contrato público de auditoria.

## Invariantes
Plaintext clínico nunca chega ao repositório, banco, auditoria, fila ou log. Cada registro possui UUID, contexto AAD `clinical-record:<id>`, versão de chave e autor.

## Dados sensíveis
Conteúdo clínico é L3. Só a psicóloga proprietária com perfil ativo e AAL2 poderá ler ou escrever após as tasks de leitura controlada.

## Proibições
Secretaria e contabilidade não recebem plaintext, ciphertext ou metadados clínicos. Clinical não é consumido por busca global, financeiro ou relatórios administrativos.
