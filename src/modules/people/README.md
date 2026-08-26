# People

## Responsabilidade

Manter o cadastro único de pessoas e seus relacionamentos administrativos.

## Public API

Consumidores importam tipos de pessoa e normalizadores de `public.ts`.

## Owns

`people`, `person_relationships` e normalização de identificadores de contato.

## Consumes

Somente identidade pública para o ator da operação; não importa agenda,
financeiro ou infraestrutura de outro módulo.

## Invariantes

CPF e e-mail são normalizados antes da persistência. CPF e e-mail não nulos
são únicos. Uma relação idêntica não pode ser duplicada.

## Dados sensíveis

CPF, data de nascimento e endereço fiscal são dados pessoais; não aparecem em
logs técnicos nem em fixtures de produção.

## Proibições

Não duplicar pessoa por contexto de negócio, não armazenar CPF bruto e não
expor a tabela bruta a contabilidade quando uma view mínima for suficiente.
