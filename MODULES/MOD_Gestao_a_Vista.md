---
title: "Gestão à vista (DLs)"
aliases: ["Gestão a vista", "GAV CB LOG"]
type: module
domain: projects
status: review
project: "HubLogistico"
created: 2026-11-16
updated: 2026-11-16
summary: "Quadro anual de gestão à vista dos DLs (CB LOG CBAR e CB LOG II CCRT): ~40 indicadores mensais de volume, produtividade, perdas, custo, frota e empilhadeiras, com 28 gráficos."
tags: []
related: []
sources: ["GESTÃO À VISTA - CB LOG CBAR.xlsx e - CB LOG II CCRT.xlsx (2026) — analisados em 2026-11-16"]
---
# Gestão à vista (DLs)

## Arquivos
`Gestão à vista/<AAAA>/GESTÃO À VISTA - CB LOG CBAR.xlsx` e `... - CB LOG II CCRT.xlsx` (um par por ano, 2024–2026, ~0,2 MB).

## Estrutura
- `Dados`: uma linha por indicador, colunas jan–dez do ano corrente + acumulado + jan–dez do ano anterior + blocos auxiliares de cálculo. Indicadores listados em [[12_PROJECTS/Active/HubLogistico/INDICATORS#12. Outros|catálogo §12]].
- Abas só de gráfico (28 no total): `Volume`, `Cubos`, `Retorno e QTA`, `Cargas e Pedidos`, `Easy Pallet` (2), `Perdas Estoque`, `Custo Dist`, `KM`, `Des Motoristas`, `Manut Frota`, `Empilhadeiras`.
- `PLAN 2024` (oculta): projeção 2024 com `#REF!` (quebrada).

## Fontes (todas digitadas a partir de outros acompanhamentos)
| Bloco | Origem |
|---|---|
| Faturamento, volume, cubos, ocupação, cargas, pedidos, retorno | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Montagem_de_Cargas\|Montagem]] |
| Produtividade Easy Pallet, tempo de montagem | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Montadores\|Montadores]] |
| Perdas | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Perdas_de_Estoque\|Perdas]] |
| KM, consumo | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_KM_Planejado_x_Realizado\|KM]] e abastecimento |
| Green Mile, TRIXLOG, ajudantes por carga | portais / Transportes 1x1 |
| Custo de distribuição, manutenção de frota, pneus, empilhadeiras | **fora do zip** (financeiro/manutenção) |

## Proposta para o Hub
- É a visão mensal histórica; vira a aba "Mensal" do Hub, preenchida a partir das tabelas dos outros módulos.
- Custos (distribuição, manutenção, empilhadeiras) precisam de fonte nova: pedir o relatório de onde vêm hoje.
