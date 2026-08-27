# Legal & Professional Compliance Notes

> Documento de requisitos e riscos para implementação. Não substitui revisão jurídica/contábil antes do go-live.

## 1. Contrato de psicoterapia

O Código de Ética/CFP e materiais profissionais atuais reforçam que a prestação de psicoterapia deve estabelecer contrato verbal ou escrito com direitos/deveres, condições, objetivos, honorários, frequência, tempo de sessão, modalidade e registro do serviço.

Arquitetura decorrente:

- versão do termo/contrato é persistida;
- paciente aceita antes do atendimento inicial quando aplicável;
- conteúdo assinado é imutável;
- histórico mantém versões antigas;
- mudanças materiais exigem novo aceite conforme regra de negócio/jurídica.

## 2. Política de cancelamento e falta

Regra operacional definida para o projeto:

- cancelamento sem cobrança: mínimo de 48 horas computáveis;
- sábado e domingo não contam;
- cancelamento fora do prazo e falta podem gerar cobrança do horário reservado;
- exceção manual é permitida com justificativa/auditoria.

A política deve aparecer:

1. no formulário/termo antes do aceite;
2. novamente na comunicação de confirmação;
3. no fluxo de cancelamento quando o prazo já tiver encerrado.

Implementação deve registrar `policy_version` e `cancellation_deadline_at` para provar qual regra se aplicava à consulta.

### Diretriz de redação

Preferir linguagem clara e não punitiva, descrevendo cobrança do horário reservado e condições de cancelamento. Evitar criar multa adicional sem validação jurídica específica.

## 3. Assinatura eletrônica simples

Objetivo não é obrigar ICP-Brasil no fluxo comum.

A evidência técnica deve demonstrar:

- qual documento/versão foi aceito;
- conteúdo congelado/hash;
- quem declarou a assinatura;
- data/hora;
- contexto técnico de acesso;
- declaração explícita de veracidade e concordância;
- impossibilidade de alteração silenciosa posterior.

Se futuramente houver documento que exija nível probatório maior, o módulo `signatures` deve permitir adapter externo sem alterar `forms`.

## 4. LGPD e dados sensíveis

Dados referentes à saúde são dados pessoais sensíveis.

Consequências obrigatórias:

- finalidade e minimização;
- acesso por necessidade;
- medidas técnicas/administrativas desde a concepção;
- segregação clínica;
- proteção de storage/logs/backups;
- processo de incidentes;
- nenhuma coleta técnica excessiva sem finalidade definida.

A base legal concreta de cada categoria de tratamento será documentada antes do go-live no registro de operações de tratamento.

## 5. Mensagens

WhatsApp/e-mail administrativos não devem revelar terapia, diagnóstico, motivo de consulta ou qualquer conteúdo de saúde.

Exemplo de princípio: "Você possui um horário agendado" em vez de mensagem que exponha psicoterapia/condição clínica em tela bloqueada de terceiro.

## 6. NFS-e e entidade prestadora

A integração fiscal deve ser parametrizada porque o prestador efetivo precisa ser confirmado antes do live:

- CPF/autônomo ou CNPJ;
- inscrição municipal;
- regime tributário;
- código/lista de serviço;
- alíquotas/retenções aplicáveis;
- regras atuais do Emissor Nacional/Belo Horizonte.

Não codificar essas premissas como constantes enquanto não forem validadas.

### Situação normativa observada em agosto/2026

- Portal Nacional mantém documentação de produção e produção restrita para API do contribuinte.
- Simples Nacional ME/EPP: obrigação nacional anunciada para 01/09/2026.
- Belo Horizonte informou em 27/07/2026 adiamento para 01/01/2027 da obrigação de documento fiscal por pessoas físicas, com possibilidade de emissão voluntária mediante habilitação.

Esses fatos devem ser revalidados imediatamente antes do go-live fiscal, pois podem mudar.

## 7. Falta/cancelamento e documento fiscal

O sistema não presume automaticamente que cobrança por falta/cancelamento gera o mesmo documento fiscal de serviço realizado.

O módulo fiscal recebe uma `fiscal_treatment` configurada/validada para cada tipo de origem. Até validação contábil, usar sandbox e impedir emissão live desse caso.

## 8. Registro psicológico

O sistema deve suportar registro documental do serviço com acesso restrito e sigilo. Retenção, exportação e descarte do conteúdo clínico serão implementados conforme regra profissional/jurídica validada.

## 9. Go-live gate jurídico

Antes de produção com pacientes reais:

- texto final de contrato/termo revisado;
- política de cancelamento revisada;
- política de privacidade/avisos definidos;
- registro de operações LGPD preparado;
- entidade e parâmetros fiscais confirmados;
- política de retenção definida;
- responsáveis por controlador/operadores/encarregado avaliados conforme aplicável.

## 10. Retenção e solicitações de titulares

O inventário e o procedimento operacional ficam em `docs/DATA_INVENTORY.md`,
`docs/operations/DATA_RETENTION.md` e `docs/operations/PRIVACY_REQUESTS.md`.
Eles são defaults sujeitos a validação jurídica, contábil e profissional; não
autorizam exclusão automática de dados clínicos, fiscais, assinados ou de
auditoria.

Na revisão de 27/08/2026 foram consultadas a página de direitos dos titulares e
o regulamento de incidentes da ANPD, a orientação do CFP sobre guarda de
documentos psicológicos e a Lei 13.787/2018. A ANPD informa prazo de três dias
úteis para comunicação de incidente relevante sob a Resolução 15/2024; o fluxo
de incidente deve ser validado para o caso concreto.

## Referências principais

- CFP — Código/Resolução vigente sobre psicoterapia e materiais profissionais.
- Lei 13.709/2018 — LGPD.
- MP 2.200-2/2001 — documentos/assinaturas eletrônicas.
- Código Civil e CDC — contratos, boa-fé, transparência e cláusulas de consumo.
- Portal Nacional NFS-e — documentação técnica vigente.
- Prefeitura de Belo Horizonte — BHISS/Avisos.
- [ANPD — direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares).
- [ANPD — comunicação de incidente](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis).
- [CFP — guarda de documentos](https://site.cfp.org.br/servicos/orientacao-e-etica/duvidas-frequentes-de-orientacao-e-etica/).
- [Lei 13.787/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13787.htm).
