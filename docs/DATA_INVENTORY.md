# Inventário de Dados

Inventário operacional do MVP. A base legal final, o controlador, o operador e
as retenções devem ser confirmados no registro de operações antes do go-live.

| Classe | Categoria e origem | Sistema/destino | Acesso | Sensível | Regra de retenção |
| --- | --- | --- | --- | --- | --- |
| L0 | Conteúdo institucional | Site público | Público | Não | Revisão editorial |
| L1 | Agenda, confirmações e eventos | Supabase administrativo/outbox | Staff conforme papel | Não clínico | Relação ativa + revisão anual |
| L2 | Cadastro, contato, contato de emergência, responsáveis e pagamentos | Supabase people/finance | Secretaria/contabilidade conforme necessidade | Pessoal/financeiro | Enquanto necessário + obrigação legal/defesa |
| L2 | Documentos fiscais e artefatos | Supabase fiscal + bucket privado/provider fiscal | Contabilidade/owner | Fiscal/PII | Obrigação fiscal aplicável + defesa |
| L2 | Mensagens e tentativas | Outbox/inbox/provider | Operação mínima, sem conteúdo clínico | Pode conter contato | Retenção operacional curta e revisão |
| L3 | Formulários sensíveis e assinatura vinculada | Supabase forms/signatures/bucket privado | Psicóloga autorizada; assinatura conforme finalidade | Saúde/conteúdo sensível | Regra profissional/legal; sem exclusão automática |
| L3 | Registros e anexos clínicos | Schema `clinical`/storage privado | Somente `psychologist_owner` + AAL2 | Saúde | Prontuário/documento conforme norma e avaliação |
| L2 | Audit log sanitizado | Supabase audit | Owner/AAL2 e operação autorizada | Metadados | Mínimo necessário para prestação de contas e defesa |
| L4 | Chaves, tokens e credenciais | Secret manager/GitHub/Vercel env | Runtime autorizado | Segredo | Rotação, revogação e expiração; nunca no banco/repo |

## Regras transversais

- Reports e busca global não recebem L3 nem campos clínicos.
- Logs técnicos recebem apenas IDs opacos, estado, duração, erro sanitizado e
  correlation ID; não recebem CPF completo, contatos desnecessários, respostas,
  tokens ou payload de provider.
- Destinos externos são limitados ao provider necessário e usam payload mínimo;
  WhatsApp/e-mail nunca carregam conteúdo clínico.
- Backups seguem a mesma classificação do dado original e só são restaurados
  em ambiente isolado.

## Responsáveis a confirmar

Controlador, encarregado/canal de titular, operadores Supabase/Vercel/providers,
responsável fiscal e prazo de revisão de cada categoria devem ser preenchidos
no checklist de produção. Este arquivo não substitui o registro jurídico.
