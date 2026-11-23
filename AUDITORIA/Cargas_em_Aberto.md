---
title: "Cargas em aberto — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "[[MOD_Cargas_em_Aberto]]"
---
# Cargas em aberto (DAs)

## 1. Objetivo e público
Mostrar as vendas emitidas e ainda não acertadas, por revenda e cliente, e há quantos dias estão em aberto. Gera os prints "SEM ACERTO NORTE/SUL" enviados no fechamento.

## 2. Arquivo atual e histórico
- Atual: `Cargas em aberto\Acompanhamento de Cargas em aberto.xlsx` (231 KB, 1 aba, ~3.378 linhas).
- Mensal desde mar/2025: `AAAA\MM - Mês'AA\Acompanhamento de Cargas em aberto.xlsx` + `SEM ACERTO NORTE.png` / `SEM ACERTO SUL.png`.
- 2024 até fev/2025: um arquivo por dia, mais TXT do ERP.

## 3. Relatórios-fonte
| # | Relatório | Sistema | Filtros e período | Frequência | Aba | Amostra |
|---|---|---|---|---|---|---|
| 1 | Consulta de vendas sem acerto | **Consulta BI** (export com nome GUID, ex.: `eb75ca84-….xlsx`) | revendas CB CE Norte e CB CE Sul, emissões do período | diária | `Cargas em aberto` (A5:F) | ✅ `eb75ca84-4c74-4c57-b741-af427ad2c469.xlsx`: 6 colunas idênticas (`Revenda`, `Cli (Cód)`, `Cli Razão Social`, `Data_Acerto`, `Data Emissão`, `Venda Caixa Unitária`), 18.971 linhas |
| 2 | Posição de vendas `VDGR0017` "somente não acertados" (TXT) | ERP das revendas | mês, por revenda | fechamento (histórico) | — | ❌ não usado em nov/26. Confirmar se ainda é necessário. |

## 4. Entradas manuais
Nenhuma além da colagem. Os PNGs são prints manuais.

## 5. Regras de cálculo
- `DIAS EM ABERTO = SE(Data_Acerto = "-"; HOJE() − Data Emissão; 0)`.
- Carga mais antiga por revenda = `PROCV` na lista ordenada.

## 6. Indicadores de saída e destino
Dias em aberto por cliente e carga mais antiga por revenda → e-mail/print. Não alimenta o KPI.

## 7. Riscos e inconsistências
- `HOJE()` recalcula: o arquivo arquivado muda de valor quando reaberto.
- A amostra do BI tem 18.971 linhas e a planilha tem ~3.378. A planilha guarda só uma parte do export, provavelmente só os não acertados. **Confirmar o filtro aplicado antes de colar.**
- O nome do export do BI é um GUID, então o importador tem que reconhecer o arquivo pelo cabeçalho e não pelo nome.

## 8. Perguntas em aberto
1. Na colagem, filtra-se `Data_Acerto = "-"` ou outro critério? E qual é o período da consulta no BI?
2. O TXT `VDGR0017` ainda é usado no fechamento?

## 9. Situação no Hub
**Não implementado.** É a próxima fase pelo `IMPLEMENTATION_PLAN`, e o melhor piloto: uma fonte, layout confirmado e regra simples.
