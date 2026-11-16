---
title: "Fill rate e insuficiência (DAs)"
aliases: ["Insuficiência de estoque", "Fill rate CB Norte e Sul"]
type: module
domain: projects
status: review
project: "HubLogistico"
created: 2026-11-16
updated: 2026-11-16
summary: "Fechamento mensal da falta de estoque contra pedido entregue em CB Norte e CB Sul, por data e produto, com meta de 2% de insuficiência."
tags: []
related: []
sources: ["10 - Insuficiência - Outubro.xlsx (out/2026) — analisado em 2026-11-16"]
---
# Fill rate e insuficiência

## Arquivos
`Fill rate Insuficiencia - CB's Norte e Sul/<AAAA>/<MM> - Insuficiência - <Mês>.xlsx` (mês corrente na raiz; ~0,3 MB, o de out/2026 tem 2,7 MB por causa do cadastro de produtos). Série desde nov/2024.

## Estrutura
| Aba | Conteúdo |
|---|---|
| `CB NORTE`, `CB SUL` | cabeçalho com meta % (2%), meta em cx, pedido entregue, falta de estoque, % insuficiência, diferença; bloco por data e produto (DA, categoria, código, produto, data, pedido entregue, falta, % fill rate); totais por dia; totais por produto |
| `PRODUTOS` (oculta, ~6.500 linhas × 84 colunas) | cadastro completo de produtos do ERP (descrição, família, produto, reduzido, grupo, categoria, marca, sabor, unidade, qtd/un, pesos, NCM, impostos…) usado só para buscar o código |
| `Resumo` (oculta) | quadro por revenda lido pelo KPI |

Regras: [[12_PROJECTS/Active/HubLogistico/INDICATORS#9. Fill rate / insuficiência (DAs, mensal)|catálogo §9]].

## Entradas necessárias
1. Relatório de insuficiência/corte do mês por revenda com: categoria, produto (descrição), data, pedido entregue, falta de estoque (origem a confirmar: BI ou ERP).
2. Cadastro de produtos (uma vez, depois só atualizações).

## Problemas conhecidos
- O cadastro de produtos é colado inteiro todo mês só para um `VLOOKUP` de código.
- O "fill rate" do KPI é o % de insuficiência (3,14% Norte, 3,92% Sul em out/2026), não o fill rate em si; o PES Comercial usa fill rate ≥ 98% com outra fonte (BI). Nomear corretamente no Hub.

## Proposta para o Hub
- Cadastro de produtos único (compartilhado com Perdas).
- Dashboard: % insuficiência diária × meta, top produtos em falta, calendário de rupturas.
