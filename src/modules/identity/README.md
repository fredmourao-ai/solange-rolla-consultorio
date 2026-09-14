# Identity

Identity owns staff profiles, supported application roles, and the public
authorization vocabulary. Supabase Auth authenticates users; PostgreSQL RLS
enforces profile access. Domain code does not import Supabase SDKs.

Supported roles are `psychologist_owner`, `secretary`, and `accounting`.
Sensitive administrative profile changes require the owner role with AAL2.

## Responsabilidade

Autenticar a equipe e publicar o vocabulário mínimo de papéis e sessão.

## Public API

Consumidores importam `AppRole`, `APP_ROLES` e `isAppRole` de `public.ts`, além
de `listActiveStaffByRole`/`isActiveStaffWithRole` para outros módulos
resolverem, de forma somente-leitura, quem é um usuário staff ativo com um
papel específico (ex.: validar que um destinatário de handoff é uma
`secretary` ativa) sem acessar a tabela `profiles` diretamente.

## Owns

Perfis de staff, atribuição de papel e helpers SQL de role/AAL.

## Consumes

Supabase Auth somente na camada de infraestrutura; o domínio recebe dados de
sessão normalizados.

## Invariantes

Papéis fora do conjunto suportado são rejeitados. Administração de perfis exige
`psychologist_owner` com AAL2.

## Dados sensíveis

Tokens, secrets e conteúdo clínico não pertencem a este módulo nem são
persistidos ou registrados por ele.

## Proibições

Não usar `service_role` em fluxo interativo, não importar infraestrutura de
outro módulo e não substituir RLS por checagem somente no cliente.
