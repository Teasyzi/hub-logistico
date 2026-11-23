---
title: "Retorno por motivo — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "[[MOD_Retorno_por_Motivo]]"
---
# Retorno por motivo

## 1. Objetivo e público
Explicar o retorno do mês: quanto voltou, por qual motivo e com qual motorista, nas 4 unidades.

## 2. Arquivo atual e histórico
- Atual: `Retorno por motivo\10. Retorno - Outubro.xlsx` (626 KB, fechamento de out/26).
- Histórico: `AAAA\MM.Retorno - <Mês>.xlsx`, desde jul/2025.

| Aba | Estado | Conteúdo |
|---|---|---|
| `CB NORTE`, `CB SUL` | visível | volume cx unit do mês; motivo × retorno × %; retorno por motorista em R$. **Valores colados, sem base oculta em out/26** |
| `DLS` | visível | Barreiras e Juazeiro: motivo × retorno × % (`SOMASE` em `cbar`/`ccrt`) |
| `cbar`, `ccrt` | oculta | colagem do VOLUMES DE RETORNOS / ZSD0090 do mês (+ coluna AP/AQ com o motivo normalizado) |

## 3. Relatórios-fonte
| # | Relatório | Sistema | Filtros e período | Frequência | Aba | Amostra |
|---|---|---|---|---|---|---|
| 1 | `01 - VOLUMES DE RETORNOS ... .XLSX` | SAP Solar CBAR | mês fechado | mensal | `cbar` | ✅ 41 colunas idênticas |
| 2 | `ZSD0090 ... .xls` | SAP Solar CCRT | mês fechado | mensal | `ccrt` | ✅ mesmo layout |
| 3 | Devoluções por motivo e motorista dos DAs (em 2025: `Revenda, CodCli, Razão Social, Motorista, Dev Motivo, Dia_Acerto, Saída cx unit, Dev cx unit`) | Consulta BI | mês, CB CE Norte/Sul | mensal | `CB NORTE` / `CB SUL` (valores colados) | ❌ faltando |
| 4 | Volume cx unit do mês por unidade | Montagem (DLs) / BI (DAs) | mês | mensal | `E5` de cada aba | DLs via Hub; DAs ❌ |

## 4. Entradas manuais
- Tabelas dos DAs coladas como valor.
- Volume dos DAs.
- Motivo normalizado nos DLs (coluna AP digitada/ajustada).

## 5. Regras de cálculo
- % retorno = retorno do motivo ÷ volume do mês.
- "Total retorno s/ cancelamento NF" exclui motivos administrativos. A regra **difere entre Norte e Sul**; o Norte subtrai a constante −328 (ver MOD).

## 6. Indicadores de saída e destino
Pareto de motivos e retorno por motorista → reunião mensal. O índice de retorno também vai ao KPI e ao PES.

## 7. Riscos e inconsistências
- A base dos DAs não fica guardada (só os valores), então não dá para auditar o número.
- A regra de exclusão não é a mesma entre Norte e Sul.
- Histórico de arquivos de 179 MB (2025) por intervalo usado inflado. Em 2026 o tamanho já está normal.

## 8. Perguntas em aberto
1. Qual é a consulta do BI que dá o retorno dos DAs por motivo e motorista? Ela ainda tem o layout de 2025?
2. Qual é a regra única de motivos administrativos?

## 9. Situação no Hub
**Não implementado** (fase 7). Os DLs podem reaproveitar a tabela `retorno` da Montagem, porque o layout já está confirmado. Os DAs dependem da amostra 3.
