# Resposta a Incidentes

## Ordem de resposta

1. Classificar severidade e abrir protocolo com correlation ID.
2. Conter exposição, duplicidade ou emissão indevida; desligar somente o
   provider afetado por kill switch.
3. Preservar audit log e evidências sanitizadas, sem copiar conteúdo clínico.
4. Rotacionar secrets comprometidos fora do repositório e revogar sessões,
   capabilities e webhooks suspeitos.
5. Avaliar categorias e titulares de dados pessoais afetados, incluindo L3/L4,
   e acionar o responsável de privacidade para as notificações exigidas.
6. Restaurar a operação mínima em ambiente isolado, validar RLS e promover a
   correção por migration forward-only.
7. Fazer postmortem com causa raiz, timeline, impacto, evidência, teste de
   regressão e ações com responsável/prazo.

## Classificação

- P0: exposição confirmada de L3/L4, acesso indevido amplo ou perda de dados.
- P1: indisponibilidade de agenda/financeiro, duplicidade financeira ou falha
  fiscal com impacto operacional relevante.
- P2: falha limitada sem exposição confirmada e com workaround.

Não registrar segredos, tokens, XML fiscal bruto, respostas, diagnósticos ou
identificadores pessoais completos no incidente.
