# Rastreabilidade de Requisitos — Recuperação Operacional Solange

**Objetivo:** impedir que requisitos definidos anteriormente desapareçam durante a implementação. Cada item abaixo aponta para a onda, validação e persona principal.

## Regras de rastreabilidade

- Um requisito só muda de `planned` para `implemented` com commit/PR identificável.
- Só muda para `validated` após teste automatizado aplicável e homologação visível quando houver UI.
- Requisito removido exige decisão explícita e registrada; não pode sumir silenciosamente.
- Em conflito, prevalecem `AGENTS.md`, `docs/ARCHITECTURE.md`, ADRs vigentes e a spec operacional 2026-09-11.

| ID | Requisito | Persona | Onda | Evidência final | Estado inicial |
|---|---|---|---:|---|---|
| R001 | Cadastro de usuários | Admin | 0 | A01–A04 | planned (UI/RPCs de administração aguardando merge do PR#119) |
| R002 | Perfil-base + permissão individual por rotina | Admin | 0 | A04–A10 | implemented (#116) |
| R003 | `deny` explícito prevalece | Admin | 0 | A05 | implemented (#116) |
| R004 | Usuário inativo perde acesso | Admin | 0 | A11/Q02 | implemented (#116) |
| R005 | Secretaria/Contabilidade nunca obtêm clínica por checkbox | Segurança | 0 | A07/P12 | implemented (#116) |
| R006 | Alteração de permissão auditada | Admin | 0 | A12 | planned (RPCs auditadas aguardando merge do PR#119) |
| R007 | Permissões críticas exigem MFA/AAL2 | Admin | 0 | A01/A12 | implemented (#116) |
| R008 | Menu respeita permissões | Todos | 0/1 | A08/A10 | planned (PR#120 aberto, não mesclado) |
| R009 | Backend/banco respeitam permissões, não só UI | Segurança | 0 | A09/Q01 | implemented (#116, `has_permission()`) |
| R010 | `Pessoas` exibido como `Pacientes` | Secretaria/Profissional | 1 | S01 | planned |
| R011 | Sidebar rolável em desktop | Todos | 1 | S02/U01 | planned |
| R012 | Cadastro administrativo completo e editável | Secretaria | 1 | S03/S08/S09 | planned |
| R013 | Busca de paciente por nome/CPF/telefone/e-mail | Secretaria | 1 | S04–S06 | planned |
| R014 | Paciente 360° como hub | Todos | 1 | S07 | planned |
| R015 | Responsável legal | Secretaria | 1 | S10 | planned |
| R016 | Responsável financeiro | Secretaria | 1 | S10 | planned |
| R017 | Tomador fiscal | Secretaria | 1 | S10 | planned |
| R018 | Contato de emergência | Secretaria/Profissional | 1 | S03/S07 | planned |
| R019 | Última e próxima consulta na ficha | Todos | 1/2 | S11 | planned |
| R020 | Processo/acompanhamento terapêutico | Profissional | 1/3 | P03–P05 | planned |
| R021 | Agenda Hoje/Dia/Semana/Mês | Todos | 2 | G01 | implemented (#122) |
| R022 | Nova consulta diretamente da Agenda | Secretaria/Profissional | 2 | G02–G04 | implemented (#122) |
| R023 | Clique em horário vazio para agendar | Secretaria/Profissional | 2 | G03 | planned (fluxo atual usa botão "Nova consulta", não clique no slot) |
| R024 | Recorrência semanal/quinzenal/personalizada | Secretaria/Profissional | 2 | G05 | planned |
| R025 | Alterar uma ocorrência sem destruir série | Secretaria/Profissional | 2 | G06 | planned (depende de R024) |
| R026 | Reagendamento preserva histórico | Secretaria/Profissional | 2 | G06 | implemented (#122, `/agenda/gerenciar` com checagem de conflito) |
| R027 | Bloqueio de horários/folga/férias | Secretaria/Profissional | 2 | G07 | planned |
| R028 | Conflito bloqueado no servidor/banco | Segurança/Agenda | 2 | G08 | implemented (#122, `assertNoConflict` em server action) |
| R029 | Confirmação de consulta | Secretaria/Paciente | 2 | G09 | implemented (#122) |
| R030 | Check-in `Paciente chegou` | Secretaria | 2 | G10/H01 | implemented (#122, status `checked_in`) |
| R031 | Estados da agenda em linguagem humana | Todos | 2 | G12 | implemented (#122 na visão principal; `/agenda/gerenciar` ainda expõe status cru — ver nota) |
| R032 | Nenhum UUID exigido em rotina de agenda | Todos | 2 | G13 | implemented (#122, seleção por nome em `<select>`) |
| R033 | Iniciar atendimento diretamente da consulta | Profissional | 3 | P06/P07 | planned |
| R034 | Profissional vê histórico necessário durante consulta | Profissional | 3 | P04/P05 | planned |
| R035 | Prontuário longitudinal legível | Profissional | 3 | P04/P05/P10 | planned |
| R036 | Anamnese/avaliação inicial | Profissional | 3 | P05 | planned |
| R037 | Demanda e objetivos do acompanhamento | Profissional | 3 | P05 | planned |
| R038 | Evoluções por sessão | Profissional | 3 | P08/P10 | planned |
| R039 | Encaminhamentos/próximos passos | Profissional | 3/4 | P08/H05 | planned |
| R040 | Correção por nova versão, sem edição destrutiva | Profissional | 3 | P11 | planned |
| R041 | Clinical plaintext somente server-side | Segurança | 3 | Q03 | planned |
| R042 | Secretaria vê estado operacional, nunca conteúdo clínico | Secretaria | 3/4 | P12/H03/H04 | planned |
| R043 | AAL1 não lê clínica | Segurança | 3 | P13 | planned |
| R044 | AAL2 com permissão negada não lê clínica | Segurança | 3 | P14 | planned |
| R045 | Tarefa Profissional→Secretaria | Ambos | 4 | H05/H06 | planned |
| R046 | Tarefa não copia evolução clínica | Segurança | 4 | H07 | planned |
| R047 | Handoff chegada→atendimento→conclusão | Ambos | 2–4 | H01–H04 | planned |
| R048 | Dashboard específico da Secretaria | Secretaria | 4 | D01 | planned |
| R049 | Dashboard específico da Profissional | Profissional | 4 | D02 | planned |
| R050 | Dashboard específico da Administradora | Admin | 4 | D03 | planned |
| R051 | Dashboard respeita permissões | Todos | 4 | D04 | planned |
| R052 | Formulários no contexto do paciente/consulta | Secretaria/Profissional | 4 | F01–F03 | planned |
| R053 | Documentos no contexto do paciente | Todos | 4 | F04/F05 | planned |
| R054 | Comunicação WhatsApp/e-mail contextual | Secretaria/Profissional | 4 | F06–F08 | planned |
| R055 | Financeiro por paciente/consulta | Secretaria/Admin | 4 | M01–M04 | planned |
| R056 | Pagamentos parciais/múltiplos | Secretaria/Admin | 4 | M02/M03 | planned |
| R057 | Agenda/financeiro/fiscal com estados independentes | Arquitetura | 2–4 | M04 | planned |
| R058 | NFS-e contextual | Secretaria/Admin | 4 | M05–M07 | planned |
| R059 | Erros de integração em linguagem humana | Todos | 4 | M06/U05 | planned |
| R060 | Integrações externas assíncronas/idempotentes | Arquitetura | 4/5 | F07/M07/Q07 | planned |
| R061 | Refresh comprova persistência de mutações | Todos | 1–5 | S09/P10 | planned |
| R062 | Validação real via UI visível | Todos | 5 | matriz completa | planned |
| R063 | Desktop 1366×768 utilizável | Todos | 1/5 | U01 | planned |
| R064 | Mobile suportado | Todos | 1/2/5 | U02 | planned |
| R065 | Ações principais navegáveis por teclado | Todos | 5 | U03 | planned |
| R066 | Estados não dependem só de cor | Todos | 5 | U04 | planned |
| R067 | Sem enums/códigos técnicos na UI normal | Todos | 1–5 | U06 | planned |
| R068 | Ações primárias no contexto correto | Todos | 1–4 | U07 | planned |
| R069 | Dados sintéticos em testes/homologação | Segurança | todas | Q10 + revisão | implemented (`scripts/verify-synthetic-seed.mjs`, `tests/integration/seed-isolation.test.ts`) |
| R070 | Migrations forward-only | Arquitetura | todas | Q08/Q09 | implemented (`scripts/check-migrations.mjs` + governance-gate no CI) |
| R071 | Nenhum trabalho aceito abandonado sem merge/decisão | Engenharia | todas | governança release | planned |
| R072 | Codex por task/worktree/sessão isolada | Engenharia | todas | ledger/PRs | planned |
| R073 | Codex usage-limit reset oficial deve ser resgatado quando disponível antes de bloqueio | Engenharia | todas | ledger de dispatch | planned |

## Nota de verificação — 2026-09-12

Atualização feita por leitura direta de `origin/main` (não por autodeclaração): PRs #115, #116, #117, #118 (Onda 0 — catálogo/persistência de permissões, `has_permission()`) e #122 (Onda 2 — agenda) foram inspecionados arquivo a arquivo antes de qualquer mudança de estado. Nenhum item foi promovido a `validated`: falta homologação visível via UI real (R062), que ainda não ocorreu nesta rodada.

Lacuna encontrada durante a verificação (não bloqueia o estado `implemented` do requisito correspondente, mas deve ser corrigida): a página `/agenda/gerenciar` exibe o status bruto da consulta (`{appointment.status}`, ex.: `checked_in`) em vez do rótulo em português usado na visão principal da agenda (`statusLabels` em `calendar.tsx`). Isso também tangencia R067 (sem enums/códigos técnicos na UI normal).

PRs abertos e ainda não mesclados no momento desta nota — não contam como implementados até merge real: #119 (administração de usuários), #120 (menu por permissão), #121 (ficha 360), #123 (atendimento/prontuário), #127 (diagnóstico de staging), #128 (correção do Staging Promote), #129 (fila de tarefas colaborativas).

## Itens posteriores ao núcleo operacional

Os itens abaixo permanecem no roadmap, mas não bloqueiam o P0 se não forem necessários para a rotina atual: fila de espera avançada, portal do paciente expandido, teleatendimento, IA clínica assistiva com consentimento/revisão, FHIR/RNDS, TISS/TUSS/prescrição/estoque médico. A inclusão futura deve respeitar a mesma arquitetura e passar por spec própria.
