---
title: "Montagem de Cargas + Reprogramação DL's — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "[[MOD_Montagem_de_Cargas]]"
---
# Montagem de Cargas e Reprogramação DL's (Barreiras e Juazeiro)

## 1. Objetivo e público
Resumo diário de volume, faturamento, cargas, ocupação, cubos/carga, notas/carga, retorno e reprogramação dos DLs, com meta, ACM e tendência. Também alimenta o PES Logístico e o KPI.

## 2. Arquivo atual e histórico
- Atual: `Montagem de Cargas\11 - Montagem de Cargas - CB Logística.xlsm` (930 KB, **VBA**) e `Reprogramação DL's - 11 Novembro.xlsx` (25 KB).
- Fechados: `2026\MM - Montagem de Cargas - CB Logística.xlsm` e `2026\Reprog\Reprogramação DL's - MM <Mês>.xlsx`.
- Apoio:
  - `Metas Volume e Faturamento DLs e OT 2026.xlsx`, com link externo para uma planilha num OneDrive pessoal;
  - `2026\Ajustes de Valores - DL's.xlsx`.

| Aba | Estado | Conteúdo |
|---|---|---|
| `RESUMO` | visível | dias úteis/trabalhados/restantes, volume, faturamento, montagem |
| `BARREIRAS`, `JUAZEIRO` | visível | dia a dia: volume plan, entregas, cargas, cubos, ocupação, reprog |
| `Venda Barreiras` / `Venda Juazeiro` | oculta | colagem da venda SAP |
| `Retorno Barreiras` / `Retorno Juazeiro` | oculta | colagem do retorno SAP |

## 3. Relatórios-fonte
| # | Relatório | Sistema | Filtros e período | Frequência | Aba | Amostra |
|---|---|---|---|---|---|---|
| 1 | `01 - VOLUMES DE VENDAS dd.mm.aaaa a dd.mm.aaaa.XLSX` | SAP Solar, centro **CBAR** | 1º dia do mês até hoje | diária | `Venda Barreiras` | ✅ 47 colunas **idênticas** |
| 2 | `ZSD0092 dd.mm.aaaa A dd.mm.aaaa.xls` | SAP Solar, centro **CCRT** | idem | diária | `Venda Juazeiro` | ✅ 47 colunas, mesmo layout |
| 3 | `01 - VOLUMES DE RETORNOS ... .XLSX` | SAP Solar CBAR | idem | diária | `Retorno Barreiras` | ✅ 41 colunas idênticas (a aba tem 3 colunas a mais, calculadas) |
| 4 | `ZSD0090 ... .xls` | SAP Solar CCRT | idem | diária | `Retorno Juazeiro` | ✅ 41 colunas, mesmo layout |
| 5 | `Resumo de Planejamento - Diário - CBAR_V5.xlsm` / `- CCRT.xlsm`, abas `Resumo Geral` e `Paradas` | Roadnet (conexões ODBC no próprio arquivo) | dia seguinte | diária | Reprogramação DL's (categoria `REPROG` em `Paradas`) | ✅ ambos |

O nome muda por centro: VOLUMES (`.XLSX`) para Barreiras e ZSD (`.xls`) para Juazeiro. O conteúdo é o mesmo relatório.

## 4. Entradas manuais
- Dias úteis.
- Metas de volume e faturamento, do arquivo de metas.
- Tarifa de faturamento (nov/26: 2,97 Barreiras e 2,85 Juazeiro).
- Correções na Reprogramação.

## 5. Regras de cálculo
Documentadas no MOD e no `INDICATORS.md`:
- retorno volume = retorno **EXTERNO** ÷ venda;
- cubos ÷ 1,6;
- meta de reprogramação de 3%.

## 6. Indicadores de saída e destino
RESUMO → e-mail diário, aba oculta do KPI e PES Logístico (retorno volume/cliente, reprog volume/cliente).

## 7. Riscos e inconsistências
- O arquivo de metas depende de um OneDrive pessoal. O ideal é que as metas fiquem na tabela `parametro` do Hub.
- O fator de cubo 1,6 aqui é diferente do 1,66 no KPI.
- Pendência do `TASKS.md`: coluna E da Reprog Barreiras de nov (1,99% → 1,74%).
- Os `.xlsm` do Resumo de Planejamento recebidos em 23/11 **ainda têm conexões ODBC** (6 por arquivo). O `TASKS.md` já registra que elas guardam usuário e senha do Roadnet. A troca de senha continua pendente, fora do Hub.

## 8. Perguntas em aberto
As do `TASKS.md`:
- ACM com o dia da pré-venda?
- Transporte em dois meses conta uma vez ou duas?
- "% retorno cliente" pela definição da Solar.

## 9. Situação no Hub
- **Implementado e validado (jan–nov/26)**, em uso no site como conferência.
- O layout das amostras de 23/11 é o mesmo dos importadores (`code/hub/importar.py`, `docs/js/importar.js`), então não há mudança de layout a tratar.
- Ver `revisao_hub.md`.
