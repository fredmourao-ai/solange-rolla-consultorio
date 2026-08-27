# Solicitações de Titulares

## Canal e protocolo

Manter um canal autenticado e separado de WhatsApp/e-mail para solicitações de
titular. Gerar protocolo opaco, registrar data, categoria, escopo e responsável;
não colocar o conteúdo solicitado no protocolo ou no log técnico.

## Procedimento

1. Confirmar a identidade e a legitimidade do solicitante, inclusive
   representação de responsável, sem aceitar pedido anônimo para exportação.
2. Localizar dados por `person_id`, nunca por busca ampla de nome ou CPF em logs.
3. Classificar pedido: confirmação/acesso, cópia, correção, portabilidade quando
   aplicável, oposição, revogação, restrição, anonimização ou eliminação.
4. Mapear fontes e operadores no inventário; registrar o que foi encontrado,
   omitido e a justificativa legal/operacional.
5. Entregar cópia por canal autenticado e temporário. Não enviar export clínico,
   fiscal ou assinado por e-mail/WhatsApp sem canal seguro apropriado.
6. Corrigir dados administrativos sem apagar histórico de auditoria. Para
   documentos clínicos, fiscais ou assinados, preservar versão e registrar
   restrição/correção conforme avaliação profissional/jurídica.
7. Para eliminação, verificar retenção legal, defesa de direitos, backup,
   replicação e provider retention antes de qualquer ação; quando impedida,
   informar a base e restringir o uso ao necessário.
8. Encerrar com resposta, data, responsável e evidência sanitizada.

Confirmação e acesso devem ser tratados imediatamente quando possível; pedidos
que exijam origem, inexistência, critérios ou finalidade devem observar o prazo
legal aplicável. Consultar a página oficial de direitos da ANPD antes de cada
procedimento normativo.

## Incidente relacionado

Se a solicitação revelar acesso indevido ou perda, abrir incidente separado,
preservar audit log e seguir `INCIDENT_RESPONSE.md`; não anexar a exportação ao
ticket.
