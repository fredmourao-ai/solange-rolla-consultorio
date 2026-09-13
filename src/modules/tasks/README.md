# Tasks

## Responsabilidade
Fila de tarefas administrativas para handoff entre Secretaria e Profissional (ex.: agendar retorno, contatar paciente, reenviar formulário, cobrar pagamento, revisar documento).

## Public API
Criação e transição de status de tarefas administrativas, com correlação opcional a paciente/consulta. `createSecretaryHandoffTask` cria o handoff Secretaria → Profissional (documento para revisão, retorno solicitado, confirmação especial, outra pendência), sempre com título fechado e predefinido por tipo, e verifica que o destinatário é uma profissional ativa antes de criar a tarefa.

## Owns
Tarefas administrativas e suas transições de status (`open`, `in_progress`, `done`, `cancelled`).

## Consumes
IDs de pessoas e consultas por contratos públicos; identidade do usuário autenticado.

## Invariantes
Título não pode ultrapassar 140 caracteres; transições a partir de `done`/`cancelled` são rejeitadas; tipo deve pertencer ao catálogo administrativo fechado.

## Dados sensíveis
Não armazena nem referencia conteúdo clínico. Este módulo não é um campo de evolução/prontuário — título e tipo são estritamente administrativos.

## Proibições
Não aceita texto de evolução clínica como título/descrição; não substitui o prontuário longitudinal do módulo `clinical`.
