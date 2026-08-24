# Module Boundaries

Este documento define quem é owner de quê. Alterações fora do owner devem usar contrato público ou alteração arquitetural explícita.

| Módulo | Owns | Pode consumir | Não pode fazer |
|---|---|---|---|
| `identity` | usuários internos, roles, sessão, MFA | audit | acessar conteúdo clínico diretamente |
| `people` | pessoa, contato, fiscal, responsável, preferências | audit | possuir consultas/pagamentos |
| `appointments` | consulta, disponibilidade, cancelamento, confirmação, falta | people, messaging contracts, audit | baixar pagamento, emitir NFS-e |
| `forms` | templates, versões, respostas, progresso | people, signatures contracts | alterar cadastro fiscal silenciosamente |
| `signatures` | evidência, hash, documento congelado | forms, storage, audit | editar resposta assinada |
| `receivables` | recebível, pagamento, desconto, estorno, isenção | people, appointments/events references, audit | alterar status clínico/agenda |
| `payables` | despesas, recorrência, comprovante | audit | manipular recebíveis |
| `events` | evento, inscrição, presença, lista de espera | people, forms, receivables contracts, audit | duplicar Pessoa |
| `messaging` | template, outbox, delivery, provider adapters | people preferences, queue, audit | acessar conteúdo clínico |
| `fiscal` | documento fiscal, adapter NFS-e, XML/PDF | people fiscal, receivables references, queue, audit | inferir regra jurídica sem configuração |
| `clinical` | registro psicológico e anexos | appointments reference, identity, audit | exportar para messaging/reports gerais |
| `automations` | schedulers e criação de jobs | contracts públicos dos módulos | escrever tabelas owners diretamente |
| `reports` | read models administrativos | APIs/views aprovadas | ler conteúdo clínico |
| `audit` | trilha imutável de ações | IDs/metadados sanitizados | armazenar conteúdo clínico bruto |

## Public contracts

Todo módulo deve expor `public.ts` contendo somente o necessário para consumidores.

Tipos internos, queries SQL, repositórios e adaptadores ficam privados ao módulo.

## Ownership de tabelas

A migration que cria uma tabela deve declarar seu módulo owner em comentário SQL ou documentação do módulo.

Outro módulo não escreve nessa tabela diretamente sem API/caso de uso do owner.

## Eventos

Eventos de integração devem usar nomes estáveis e versionáveis, por exemplo:

```text
appointment.completed.v1
appointment.cancelled.v1
payment.received.v1
form.signed.v1
event.registration.paid.v1
```

Payloads transportam IDs e dados mínimos; nunca conteúdo clínico completo.

## Read models

Relatórios complexos podem usar views/projeções próprias. Read models não viram atalhos para quebrar ownership de escrita.

## Dependências circulares

São proibidas. Se A depende de B e B precisa reagir a A, preferir evento/contrato assíncrono em uma das direções.

## Mudança de fronteira

Qualquer transferência de responsabilidade entre módulos exige ADR e atualização deste documento.
