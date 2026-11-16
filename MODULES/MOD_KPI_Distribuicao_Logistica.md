---
title: "KPI Distribuição e Logística"
aliases: ["KPI", "Painel KPI Grupo CB"]
type: module
domain: projects
status: review
project: "HubLogistico"
created: 2026-11-16
updated: 2026-11-16
summary: "Painel de uma aba com ~20 indicadores das 4 unidades (distribuição, remessa/estoque, frota), alimentado por links externos e digitação; vai virar a página inicial do Hub."
tags: []
related: []
sources: ["KPI Distribuição e Logística - Outubro.xlsx e '- Outubro - Copia.xlsx' (out/2026) — analisados em 2026-11-16"]
---
# KPI Distribuição e Logística

## Responsabilidade
Consolidar, para CB Norte, CB Sul, DL Barreiras e DL Juazeiro, os indicadores de distribuição, remessa/estoque e frota, com meta e acumulado do mês. Atualizado ao longo do mês (um arquivo por dia em 2023–2024; um arquivo por mês desde 2025-03) e fechado no início do mês seguinte.

## Arquivo atual
`KPI Distribuição e Logística/KPI Distribuição e Logística - <Mês>.xlsx` (~30 KB)
- `LOGÍSTICA E DISTRIBUIÇÃO` (visível, área de impressão `A1:T35`): 4 blocos (Distribuição, Distribuição, Remessa e Estoque, Frota/Distribuição) com colunas BASE · META · ACM (e TEND./% VS META em quilometragem). Bloco auxiliar `W:Y` "PARA ATUALIZAR PERDAS DE ESTOQUE CB" com OCO 24, OCO 28 (perdas) e OCO 1 (venda) do Kardex, Norte e Sul.
- `Montagem das cargas` (oculta): cópia do `RESUMO` da [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Montagem_de_Cargas|Montagem de Cargas]] (volume, faturamento, cargas, ocupação, reprogramação, cubos/carga, notas/carga, retorno).
- Indicadores e fórmulas: [[12_PROJECTS/Active/HubLogistico/INDICATORS#1. KPI Distribuição e Logística (painel consolidado)|catálogo §1]].

## Dependências
- Links externos (versão "Copia" de out/2026): `KM Planejado x Realizado - <Mês>.xlsm` (`Analise por dia!AH`), `Acompanhamento de Montadores - <Mês>.xlsx` (`RESUMO!I`), `<AAAA> - <MM> Perdas de Estoque - Barreiras/Juazeiro.xlsx`, `Transportes - 1x1/<MM> - Acompanhamento de transportes - 1x1 - <Mês>.xlsx` (`RESUMO!C/E`).
- Os links apontam para três variantes do mesmo caminho: relativo (`../`), absoluto sem unidade (`/OPERACIONAL/...`) e `file:///Z:\OPERACIONAL\...`.
- Digitados: TRIXLOG, Green Mile/Cashdrive, retorno dos DAs, volume/cargas/pedidos dos DAs, fill rate, bases (dias úteis/trabalhados), frota OT.
- Kardex TXT do mês (`PERDAS NORTE.TXT`, `PERDAS SUL.TXT`, às vezes `ACM ...` ou `ESTOQUE ...`): somatório das ocorrências 24 e 28 feito fora da planilha.

## Histórico
- 2023: modelo `KPI ... - Modelo.xlsx`; arquivos diários `KPI ... - DD-MM-AAAA.xlsx`, pré-fechamento e fechamento.
- Jun–ago/2024: arquivos de 0,8–7 MB (bases coladas dentro do KPI); de set/2024 em diante voltam a ~230 KB e, a partir de 2025-02, ~30 KB.
- Junto do KPI mensal ficam `Escala - Cariri/Juazeiro.xlsx` (2023–2024) e `Caixas por HH Norte e Sul`.

## Problemas conhecidos
- Links externos quebram ao trocar o mês (o nome do arquivo de origem leva o mês) e ao abrir fora do drive `Z:`.
- Valores digitados sem trilha de origem; metas fixas dentro das células (`H# = 2 × ...`, `I# = D# / 1,66`).
- O arquivo original e a "Copia" divergem: o original liga 1 arquivo externo (Transportes 1x1); a cópia liga 5.

## Proposta para o Hub
- Página inicial com os 4 blocos, cartões por unidade, farol meta × ACM × tendência e sparkline diária.
- Cada número clicável leva ao acompanhamento de origem (drill-down).
- Metas numa tabela `metas(unidade, indicador, mês, valor)` editável, fora do código.
- Faz sentido **por último**: o KPI só automatiza depois que suas fontes estiverem no Hub.
