---
title: "Perdas de Estoque DL's — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "[[MOD_Perdas_de_Estoque]]"
---
# Perdas de Estoque (DL Barreiras e DL Juazeiro)

## 1. Objetivo e público
Perdas do mês em R$ e em caixa unitária, por categoria e motivo (inventário, rota, estoque, transporte), e % sobre o volume do DL. Alimenta o KPI.

## 2. Arquivo atual e histórico
- Atual: `Perdas de Estoque - DL's\2026 - 11 Perdas de Estoque - Barreiras.xlsx` e `... - Juazeiro.xlsx` (16/11).
- Fechados: `2026\MM - Mês\2026 - MM Perdas de Estoque - <DL>.xlsx`, desde jan/2025.
- Apoio: `2026\Ajustes de preço - DL's.xlsx`.

| Aba | Estado | Conteúdo |
|---|---|---|
| `Resumo` | visível | perdas por categoria × motivo, cx unit, %, custo por cx unit |
| `Relatório` | oculta | colagem do MB59 (Barreiras a partir da linha 8; Juazeiro a partir da linha 2) + colunas calculadas MOTIVO, COD CB, QTD/UN, FAT.CONV2, PERDAS EM CX UNIT. |
| `Inventário` | oculta | diferenças de inventário (Juazeiro: `Doc.inv., Itm, Material, Lote, Dep., Texto breve, Cen., QtdContab., Qtd.contada, Qtd.difer., UMB, Dif.pos., Dif.neg.`) + conversão |
| `base` | oculta | de-para COD SOLAR → COD CB, categoria, Qtd/Un, Fat.Conv2 |

## 3. Relatórios-fonte
| # | Relatório | Sistema | Filtros e período | Frequência | Aba | Amostra |
|---|---|---|---|---|---|---|
| 1 | `RELATORIO MB59 PERDAS CBAR <MÊS> dd.mm.aaaa á dd.mm.aaaa.XLSX` | SAP (MB59, movimentos de material) | centro CBAR, mês | mensal (atualizado no mês) | `Relatório` (Barreiras) | ✅ 17 colunas **idênticas** |
| 2 | `MB59 dd.mm.aaaa A dd.mm.aaaa.xls` | SAP (MB59) | centro **CCRT** | mensal | `Relatório` (Juazeiro) | ✅ mesmo layout (17 colunas) |
| 3 | Diferenças de inventário | SAP (documento de inventário, provável MI20/MI24) | por DL, mês | mensal | `Inventário` | ❌ faltando |
| 4 | `RELATORIO KSB1 CENTROS DE CUSTO CBAR ...XLSX` | SAP (KSB1, partidas por centro de custo, ex.: "Avarias Produto Acabado") | CBAR, mês | ? | **não aparece em nenhuma planilha atual** | ✅ recebido. Confirmar o uso. |
| 5 | Volume do DL no mês | Montagem de Cargas | mês | mensal | `Relatório!AB12` ("VOLUME DL") | vem do Hub |

## 4. Entradas manuais
- De-para `base`, que precisa ser mantido quando surge produto novo.
- `Ajustes de preço - DL's.xlsx`.
- Volume do DL.

## 5. Regras de cálculo
- O motivo vem do tipo de movimento:
  - 551 → ESTOQUE;
  - 928 → ROTA;
  - 928 + referência `AV. TRANSF. S/N` → TRANSPORTE;
  - outro → "VERIFICAR".
- Perdas cx unit = qtd × Fat.Conv2 ÷ Qtd/Un.
- % = perdas cx unit ÷ volume do DL.

## 6. Indicadores de saída e destino
Perdas R$ e % por DL → KPI (K18:N28), por link externo.

## 7. Riscos e inconsistências
- A linha de cabeçalho da aba `Relatório` é diferente entre os dois arquivos (linha 8 em Barreiras e linha 2 em Juazeiro). O importador tem que achar o cabeçalho pelo nome.
- O de-para `base` está duplicado nos dois arquivos (324 × 338 linhas) e no Fill rate (`PRODUTOS`). É candidato a cadastro único de produto.
- O KSB1 pode ser uma fonte nova ou uma conferência, mas não está documentado.

## 8. Perguntas em aberto
1. Para que serve o KSB1: conferir o valor contábil das perdas ou um novo indicador?
2. Qual é o relatório de inventário (transação SAP) e quando ele é tirado?
3. Existe KSB1 para CCRT?

## 9. Situação no Hub
**Não implementado** (fase 5). As fontes 1 e 2 estão confirmadas. Falta a amostra do inventário.
