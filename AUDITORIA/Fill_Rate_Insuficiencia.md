---
title: "Fill rate / Insuficiência — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "[[MOD_Fill_Rate_Insuficiencia]]"
---
# Fill rate / Insuficiência (CB Norte e CB Sul)

## 1. Objetivo e público
Medir quanto do pedido deixou de ser entregue por falta de estoque, por dia e produto. A meta é insuficiência ≤ 2%. O resultado alimenta o KPI ("Fill rate").

## 2. Arquivo atual e histórico
- Atual: `Fill rate Insuficiencia - CB's Norte e Sul\10 - Insuficiência - Outubro.xlsx` (2,6 MB, fechamento de out/26). Novembro ainda não começou.
- Histórico: `AAAA\MM - Insuficiência - <Mês>.xlsx`, desde nov/2024, um arquivo por mês.

| Aba | Estado | Conteúdo |
|---|---|---|
| `CB NORTE`, `CB SUL` | visível | cabeçalho (meta 2%, pedido entregue, falta, % fill rate, insuficiência); a partir da linha 10, a base colada (DA, categoria, código, produto, data, pedido entregue, falta) + totais por dia e por produto |
| `PRODUTOS` | oculta | cadastro de produtos do ERP com 84 colunas, ~6.470 linhas; usado só para buscar `Reduzido` |
| `Resumo` | oculta | quadro por revenda (lido pelo KPI) |

## 3. Relatórios-fonte
| # | Relatório | Sistema | Filtros e período | Frequência | Aba | Amostra |
|---|---|---|---|---|---|---|
| 1 | Insuficiência / corte por produto e dia | **a confirmar** (BI ou ERP): colunas `DA`, `Categoria`, `Prod Descr`, `Data`, `Pedido entregue`, `Falta de estoque` | mês, revendas CB CE Norte/Sul | mensal | `CB NORTE` / `CB SUL` (B10:H) | ❌ faltando |
| 2 | Cadastro de produtos | ERP das revendas (export "Produtos") | todos | quando mudar | `PRODUTOS` | ❌ faltando |

## 4. Entradas manuais
A meta de 2% está fixa em `H5`.

## 5. Regras de cálculo
- Pedido entregue = Σ G e Falta = Σ H.
- % fill rate = falta ÷ (entregue + falta). Esse valor é a **insuficiência**; o rótulo da planilha está trocado.
- Meta em caixas = 2% × entregue. Insuficiência = falta − meta.

## 6. Indicadores de saída e destino
% insuficiência por revenda → KPI (bloco Remessa e Estoque, K30:N32).

## 7. Riscos e inconsistências
- O nome "% FILL RATE" é usado para a insuficiência, enquanto o PES Comercial usa fill rate ≥ 98%. No Hub, chamar de "Insuficiência %" e mostrar o fill rate como 1 − insuficiência.
- O cadastro de 84 colunas é colado todo mês só para um `PROCV`, o que explica os 2,6 MB.
- O `PROCV` é feito pela descrição do produto: qualquer mudança no texto quebra a busca.

## 8. Perguntas em aberto
1. De qual sistema/consulta sai a base de insuficiência? Qual o nome do relatório e quais os filtros?
2. O código do produto pode vir direto no export, em vez de ser buscado pela descrição?

## 9. Situação no Hub
**Não implementado** (fase 7 do plano). Bloqueado pela falta das amostras 1 e 2.
