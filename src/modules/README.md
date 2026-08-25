# Modules

Módulos de domínio do monólito modular.

Cada módulo pode possuir `domain`, `application`, `infrastructure`, `ui`, `public.ts` e `README.md` conforme necessidade.

## Regra de dependência

Um módulo só consome outro por `public.ts`, contratos públicos, IDs persistidos ou eventos documentados. É proibido importar internals ou `infrastructure/` de outro módulo.
