# Retenção e Descarte

As durações abaixo são defaults operacionais para planejamento, não parecer
jurídico. A coluna de condição prevalece: obrigação legal, defesa de direitos,
ordem judicial ou norma profissional prolonga a retenção e bloqueia descarte
automático.

| Categoria | Default | Evento de revisão/descarte | Controle |
| --- | --- | --- | --- |
| Cadastro e contatos | Relação ativa + 5 anos | Fim da relação, sem obrigação/defesa | Anonimizar ou restringir após revisão |
| Agenda e confirmações | 5 anos | Fim da relação e encerramento de disputas | Não apagar audit relacionado |
| Financeiro e pagamentos | 5 anos ou prazo fiscal/contábil aplicável | Última obrigação e defesa encerradas | Ledger imutável; estorno não apaga |
| NFS-e/XML/PDF fiscal | Prazo fiscal aplicável, default de revisão em 5 anos | Fim da obrigação/defesa | Bucket privado e revisão contábil |
| Mensagens/outbox | 90 dias após conclusão/falha final | Fim da tentativa e ausência de incidente | Payload mínimo e sanitizado |
| Audit log | 5 anos como default de prestação de contas | Revisão jurídica/segurança | Sem conteúdo clínico ou secret |
| Documentos psicológicos | Mínimo profissional aplicável, pelo menos 5 anos quando aplicável | Último registro + avaliação profissional | Nunca hard-delete por UI |
| Prontuário em serviço de saúde | Referência de 20 anos a partir do último registro quando a Lei 13.787/2018 for aplicável | Revisão após prazo e obrigação/defesa | Restrição, backup e descarte controlados |
| Backups | Retenção contratada do provedor | Expiração do ciclo e incidente | Criptografados e restore isolado |
| Secrets | Até expiração/rotação | Revogar imediatamente quando comprometido | Secret manager; nunca exportar |

## Descarte

O job/UI não executa hard-delete automático de clínico, fiscal, assinatura ou
audit. Um pedido gera avaliação, aprovação, evidência e, quando permitido,
anonimização/eliminação coordenada com réplicas e providers. Migrations
destrutivas seguem expand/contract e nunca são usadas como mecanismo de
retenção.

## Fontes consultadas

- [ANPD: direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares)
- [ANPD: Resolução CD/ANPD nº 15/2024 e incidentes](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca)
- [CFP: orientação sobre guarda de documentos psicológicos](https://site.cfp.org.br/servicos/orientacao-e-etica/duvidas-frequentes-de-orientacao-e-etica/)
- [Lei 13.787/2018 no Planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13787.htm)

Revalidar fontes e regras contábeis/fiscais na data de cada release.
