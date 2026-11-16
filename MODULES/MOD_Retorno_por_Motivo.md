---
title: "Retorno por motivo"
aliases: ["Retorno", "Devolução por motivo"]
type: module
domain: projects
status: review
project: "HubLogistico"
created: 2026-11-16
updated: 2026-11-16
summary: "Fechamento mensal do retorno (devolução) por motivo e por motorista nas 4 unidades; DLs pela exportação VOLUMES DE RETORNOS, DAs por base do BI."
tags: []
related: []
sources: ["10. Retorno - Outubro.xlsx, 09. Retorno - Setembro.xlsx, 12.Retorno - Dezembro.xlsx (2025, 179 MB) — analisados em 2026-11-16"]
---
# Retorno por motivo

## Responsabilidade
Explicar o índice de retorno: quanto voltou (cx unit e R$), por quê (motivo) e com quem (motorista), por unidade, no mês.

## Arquivos
`Retorno por motivo/<AAAA>/<MM>.Retorno - <Mês>.xlsx` (mês corrente na raiz). Série desde jul/2025.

## Estrutura (out/2026)
| Aba | Conteúdo |
|---|---|
| `CB NORTE`, `CB SUL` | volume cx unit do mês; tabela motivo × retorno × %; retorno por motorista em R$; gráficos |
| `DLS` | Barreiras e Juazeiro: motivo × retorno × % (`SUMIF` nas abas ocultas) |
| `cbar`, `ccrt` (ocultas) | exportação **VOLUMES DE RETORNOS** do mês (mesmo layout da [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Montagem_de_Cargas\|Montagem]]) |
| `norte`, `sul` (ocultas, em 2025) | base do BI: Revenda, CodCli, Razão Social, Motorista, Dev Motivo, Dia_Acerto, Dia Semana_Acerto, Saída (cx unit), Dev (cx unit) |

Regras: [[12_PROJECTS/Active/HubLogistico/INDICATORS#10. Retorno por motivo (mensal)|catálogo §10]]. A exclusão de motivos administrativos do total **difere entre Norte e Sul**, e o Norte ainda subtrai uma constante (`−328`) do volume.

## Problema crítico já visto: arquivos de 179 MB
Os arquivos de jul/2025 a jan/2026 têm ~179 MB cada (1,07 GB só os 6 de 2025). Causa: abas com **intervalo usado** de ~1 milhão de linhas (`ccrt` com `A1:AO1045066`, 1 GB de XML; `DAS` e `DLS` com ~1.047.500 linhas). A partir de fev/2026 o arquivo voltou a ~0,4–0,6 MB (existe um `02.Retorno - Fevereiro (ANTIGO).xlsx` de 63 MB). Solução registrada em [[Excel - Arquivo inchado por intervalo usado]].

## Entradas necessárias
1. VOLUMES DE RETORNOS / ZSD0090 do mês de cada DL.
2. Base de devolução do BI das revendas (layout `norte`/`sul` acima) ou equivalente atual.
3. Volume do mês por unidade.

## Proposta para o Hub
- Reaproveitar a tabela `retornos` da Montagem para os DLs; importar a base do BI para os DAs.
- Dashboard: Pareto de motivos, retorno por motorista e cliente, evolução mensal, separação motivo operacional × administrativo com regra única.
