---
title: "Cargas em aberto (DAs)"
aliases: ["Acompanhamento de Cargas em aberto", "Sem acerto"]
type: module
domain: projects
status: review
project: "HubLogistico"
created: 2026-11-16
updated: 2026-11-16
summary: "Lista os pedidos emitidos e ainda não acertados das revendas CB Norte e CB Sul, com dias em aberto e a carga mais antiga por revenda; no fechamento usa o TXT 'sem acerto' do ERP."
tags: []
related: []
sources: ["Acompanhamento de Cargas em aberto.xlsx (nov/2026 e ago/2026), Consulta B.I.xlsx (set/2024), SEM ACERTO NORTE - NOVEMBRO.TXT — analisados em 2026-11-16"]
---
# Cargas em aberto (DAs)

## Responsabilidade
Controlar vendas emitidas e não acertadas (mercadoria entregue sem prestação de contas no ERP), por revenda e cliente, destacando quantos dias estão em aberto.

## Arquivos
- `Cargas em aberto/Acompanhamento de Cargas em aberto.xlsx` (atual, aba única `Cargas em aberto`, ~3.500 linhas).
- 2024–fev/2025: um arquivo por dia (`... DD-MM.xlsx`), "FECHAMENTO" mensal e `Consulta BI.xlsx` (base bruta).
- Desde mar/2025: um arquivo por mês + TXT `SEM ACERTO NORTE/SUL` e, desde nov/2025, PNG do relatório (print para envio).

## Estrutura
- Cabeçalho: "ATUALIZADO EM" = `TODAY()`.
- Colunas: Revenda (`CB CE Norte`/`CB CE Sul`), Cli (Cód), Cli Razão Social, Data_Acerto, Data Emissão, Venda Caixa Unitária, DIAS EM ABERTO = `IF(Data_Acerto = "-", hoje − emissão, 0)`.
- Quadro "CARGA EM ABERTO MAIS ANTIGA" por revenda (`VLOOKUP` na lista ordenada).
- Nota na planilha: "Acompanhamento extraído do BI".

## Fontes
1. **Consulta BI** (diária): colunas `Revenda | Cli (Cód) | Cli Razão Social | Data_Acerto | Data Emissão | Venda Caixa Unitária`.
2. **Posição de vendas `VDGR0017`** (TXT do ERP, fechamento): filtro "SOMENTE NAO ACERTADOS", período do mês, por revenda (Norte/Sul); tabela de largura fixa com código, produto, bonificação, saídas, total e tendência.

## Entradas necessárias
- Exportação atual do BI (o mesmo formato acima) e os dois TXT do fechamento.

## Problemas conhecidos
- Planilha recalcula com `TODAY()`: reabrir um arquivo antigo muda os dias em aberto. O Hub deve gravar a data de referência da extração.

## Proposta para o Hub
- Ingestão da exportação BI com data de extração; histórico diário do estoque de pendências (aging).
- Dashboard: aging por faixa (0–2, 3–5, 6–10, > 10 dias), top clientes, carga mais antiga, evolução diária.
- **Candidato a piloto**: uma entrada, uma regra, resultado visível no primeiro dia.

## Implementação no site (2026-11-23)
- Rotas: `#/cargas/resumo/AAAA-MM-DD`, `#/cargas/NORTE|SUL/AAAA-MM-DD`; admin: `#/cargas/importar`, `#/cargas/publicar/AAAA-MM-DD`.
- Leitura e cálculo: `docs/js/cargas.js`. O arquivo é reconhecido pelo cabeçalho (Data_Acerto + Venda Caixa Unitária), não pelo nome.
- Regra confirmada com o export de 23/11: a planilha oficial = linhas com `Data_Acerto = "-"`. Resultado: 3.373 vendas (Norte 1.771, Sul 1.602), 324.628 cx unit; a planilha tinha ~3.378.
- As linhas já acertadas do mesmo export viram o **tempo médio de acerto** (acerto − emissão).
- Dias em aberto = data da extração (informada na importação) − emissão, sem `HOJE()`.
- Firestore:
  - `cargas_dados/{data}` guarda a foto com razão social (só admin);
  - `estado/cargas` guarda a lista de datas;
  - `cargas_publicado/{data}` e `meta/publicacoes_cargas` são lidos pelos leitores, que veem só o código do cliente.
- Teste: `code/tests_js/cargas.test.html` (sintético + arquivo real opcional).
