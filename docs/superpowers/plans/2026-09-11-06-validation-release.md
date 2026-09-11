# Onda 5 — Validação, Homologação e Release — Plano de Implementação

> **Execução:** esta onda não aceita evidência por relato. Cada gate precisa de comando/resultado, CI e homologação pela UI visível. Usar `superpowers:verification-before-completion` e `superpowers:finishing-a-development-branch`.

**Spec:** `docs/superpowers/specs/2026-09-11-solange-end-to-end-operational-design.md`
**Dependências:** Ondas 0–4 concluídas e mergeadas.

## Objetivo

Provar que a recuperação operacional inteira funciona de ponta a ponta para Administradora, Secretaria e Profissional, que os dados persistem, que autorização não possui bypass conhecido, que integrações falham de forma controlada e que o SHA homologado corresponde ao código candidato a release.

## Task 1 — Congelar candidato e inventário

Registrar:
- SHA candidato;
- branch/tag de release;
- versão Node/npm;
- migrations presentes;
- variáveis obrigatórias sem registrar segredos;
- status das integrações externas (real/sandbox/off);
- URL de homologação;
- data/hora e responsável pela execução.

Nenhum teste destrutivo usa produção com pacientes reais.

## Task 2 — Baseline reprodutível limpo

Em workspace limpo:

```bash
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run arch:check
npm run modules:check
npm run migrations:check
npm run environment:check
npm run seed:check
npm run supabase:start
npm run supabase:reset
npm run supabase:test
npm run test:e2e
npm run build
```

Registrar exit code e quantidade de testes quando a ferramenta fornecer. Qualquer falha bloqueia o release e retorna à task/onda responsável.

## Task 3 — Migrações e RLS

Validar banco do zero e upgrade do schema compatível com caminho real.

Provas obrigatórias:
- migrations históricas não foram alteradas;
- `supabase db reset` aplica tudo do zero;
- políticas RLS/funções de autorização usam sessão autenticada, não parâmetro confiado do cliente;
- usuário sem permissão falha em SELECT/INSERT/UPDATE relevantes;
- Secretaria não lê clínica;
- perfil clínico AAL1 não lê clínica;
- perfil clínico AAL2 com permissão explicitamente negada não lê clínica;
- perfil clínico AAL2 autorizado lê/cria conforme escopo;
- alterações de permissão são auditadas.

## Task 4 — Teste de autorização por rotina

Para cada grupo de permissão da matriz:
- permitido por default do papel;
- negado por override;
- permitido por override quando estruturalmente elegível;
- `deny` explícito prevalece;
- usuário inativo não acessa;
- tentativa via URL direta;
- tentativa via Server Action/API;
- tentativa via RPC/cliente Supabase quando aplicável.

Barreiras clínicas não podem ser contornadas concedendo checkbox a `secretary`/`accounting`.

## Task 5 — Homologação visível: Administradora

Na UI visível com usuário sintético:

```text
Login + MFA
-> Usuários e Acessos
-> criar/selecionar usuário Secretaria
-> conferir perfil-base e permissões efetivas
-> negar appointments.create
-> salvar
-> autenticar como Secretaria
-> confirmar botão Nova consulta ausente
-> tentar URL/action direta e receber bloqueio humano
-> voltar como Administradora
-> permitir appointments.create
-> autenticar novamente
-> criar consulta com sucesso
-> consultar histórico de alteração de acesso
```

Também validar sidebar rolável e menus condicionados.

## Task 6 — Homologação visível: Secretaria

Executar sem atalhos de banco/script:

```text
Login
-> Dashboard da Secretaria
-> Pacientes
-> criar paciente sintético completo
-> abrir ficha 360
-> editar contato/endereço
-> refresh e confirmar persistência
-> criar responsável financeiro
-> Agenda
-> Nova consulta
-> criar série recorrente
-> reagendar uma ocorrência
-> confirmar consulta
-> registrar Paciente chegou
-> observar Em atendimento quando Profissional iniciar
-> observar Atendimento concluído quando Profissional finalizar
-> receber tarefa de retorno
-> agendar retorno
-> registrar pagamento se autorizado
-> verificar NFS-e/pendência fiscal se autorizada
-> concluir tarefa
```

Durante toda a execução, confirmar que nenhum conteúdo clínico, ciphertext, ID de prontuário ou metadata sensível é exibido.

## Task 7 — Homologação visível: Profissional

```text
Login + MFA
-> Dashboard profissional
-> Agenda
-> visualizar paciente aguardando
-> abrir Paciente 360
-> consultar histórico administrativo permitido
-> abrir Prontuário
-> revisar anamnese/demanda/objetivos/sessões anteriores
-> Iniciar atendimento pela consulta
-> registrar evolução da sessão
-> criar próximo passo para Secretaria
-> Finalizar atendimento
-> refresh
-> reabrir prontuário
-> confirmar nova evolução na sessão correta
-> corrigir registro com supersede em caso sintético específico
-> confirmar original preservado e versão vigente correta
```

## Task 8 — Testes de vazamento e segurança

Executar tentativas negativas controladas:
- Secretaria abre URL clínica direta;
- Secretaria chama Server Action clínica;
- Secretaria chama RPC clínica;
- usuário clínico AAL1 tenta prontuário;
- usuário clínico AAL2 com permissão negada tenta prontuário;
- usuário sem `finance.read` tenta rota/action financeira;
- usuário sem `fiscal.issue` tenta enfileirar NFS-e;
- usuário sem `messaging.send` tenta enviar mensagem;
- usuário inativo tenta qualquer rota protegida.

Usar sentinelas sintéticas e confirmar que erros/logs/payloads não as vazam.

## Task 9 — Resiliência e idempotência

Simular:
- duplo clique em criar consulta;
- retry de finalizar atendimento;
- retry de pagamento;
- retry de envio de mensagem;
- retry de emissão fiscal;
- falha temporária de worker/integrador.

Resultado: nenhuma duplicidade lógica/financeira/clínica; jobs podem ser reprocessados de forma segura e estados intermediários são observáveis.

## Task 10 — Acessibilidade e usabilidade

Validar ao menos:
- 1366×768 desktop;
- viewport móvel suportada;
- sidebar rolável;
- foco de dialogs;
- teclado nas ações principais;
- labels de formulário;
- estados não dependem somente de cor;
- loading/error/empty states humanos;
- nenhum código interno/UUID aparece na rotina normal.

## Task 11 — Performance operacional

Medir sem inventar SLO arbitrário:
- Dashboard inicial;
- lista/busca de Pacientes;
- Agenda Dia/Semana;
- abertura da ficha 360;
- abertura do workspace clínico.

Investigar regressões óbvias/N+1. Não otimizar prematuramente para milhares de RPS sem necessidade real; focar latência percebida e queries do uso diário.

## Task 12 — Deploy de homologação

- produzir build a partir do SHA candidato;
- implantar no ambiente autorizado de homologação;
- confirmar SHA/versão exposto por mecanismo verificável;
- confirmar migrations aplicadas;
- smoke login/health antes da homologação funcional;
- não declarar válido um tunnel temporário como deploy permanente se ele não estiver ligado ao SHA candidato.

## Task 13 — Correção de achados

Qualquer achado da UI/segurança retorna para branch específica, com:
- reprodução;
- teste RED quando automatizável;
- correção;
- teste GREEN;
- suite afetada;
- rehomologação do passo e regressão adjacente.

Não aceitar `known issue` para falha P0 da jornada principal.

## Task 14 — GitHub / governança

Antes de release:
- PRs da iniciativa revisadas/mergeadas ou explicitamente descartadas com motivo;
- nenhum trabalho aceito abandonado;
- checks obrigatórios verdes;
- auto-merge habilitado quando suportado pelas regras do repo;
- Actions da release final concluídas;
- branch candidata corresponde ao `main` esperado.

## Task 15 — Evidência final

Preencher `docs/homologacao/2026-09-11-end-to-end-acceptance-matrix.md` com:
- PASS/FAIL por caso;
- SHA;
- ambiente;
- evidência automatizada;
- evidência de UI;
- observação/issue para qualquer desvio.

A matriz deve ser commitada após a execução real; não pré-marcar PASS.

## Gate final

Todos os comandos aplicáveis precisam terminar em exit 0, CI precisa estar verde e a matriz visual precisa estar sem FAIL P0/P1.

## Critério de saída

O projeto só pode receber estado **CONCLUÍDO** quando a jornada completa de Administradora, Secretaria e Profissional estiver comprovada no SHA implantado. Caso exista impedimento externo real, registrar **BLOQUEADO** com etapa exata, causa, evidência, ação externa necessária e ponto de retomada.