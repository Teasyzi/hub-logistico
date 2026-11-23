---
title: "KPI Distribuição e Logística — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "[[MOD_KPI_Distribuicao_Logistica]]"
---
# KPI Distribuição e Logística

## 1. Objetivo e público
Painel consolidado do Grupo CB (CB Norte, CB Sul, DL Barreiras, DL Juazeiro), com BASE · META · ACM em 4 blocos: Distribuição, Distribuição, Remessa e Estoque, Frota/Distribuição. É atualizado durante o mês e fechado no início do mês seguinte.

## 2. Arquivo atual e histórico
- Em uso: `KPI Distribuição e Logística\KPI Distribuição e Logística - Outubro - Copia.xlsx` (17/11/2026, 34 KB). **O nome diz "Outubro", mas os links apontam para os arquivos de Novembro.**
- Fechado: `2026\10 - Outubro'26\KPI Distribuição e Logística - Outubro.xlsx`, junto com os TXT `PERDAS NORTE/SUL (FECHAMENTO).TXT`.
- Abas: `LOGÍSTICA E DISTRIBUIÇÃO` (visível, B1:AC50) e `Montagem das cargas` (oculta, cópia do RESUMO da Montagem).

## 3. Relatórios-fonte
O KPI não recebe relatório bruto direto, a não ser o Kardex. Ele consome outras planilhas.

| # | Origem | Como entra | Indicadores | Amostra |
|---|---|---|---|---|
| 1 | `Transportes - 1x1\11 - Acompanhamento ... Novembro.xlsx` | link externo (`RESUMO`) | Projeto 1x1 ajudantes por carga | planilha ✅ |
| 2 | `Perdas de Estoque - DL's\2026 - 11 Perdas ... Barreiras/Juazeiro.xlsx` | link externo | Perdas R$ e % (DLs) | planilha ✅ |
| 3 | `Montadores\Acompanhamento de Montadores - Novembro'26.xlsx` | link externo (`RESUMO!I21`) | Easy Pallet cx/montador/hora e /dia | planilha ✅ |
| 4 | `KM Planejado x Realizado - <Mês>.xlsm` | link externo (no MOD) ou valor digitado | Quilometragem, KM planejado × realizado | planilha ✅ |
| 5 | Montagem de Cargas (`RESUMO`) | cópia na aba oculta `Montagem das cargas` | volume/carga, cubagem/carga, retorno, cargas e pedidos acumulados (DLs) | planilha ✅ |
| 6 | **Kardex `VDER0002` TXT** ("Lançamentos – posição do Kardex") | somado fora da planilha e digitado em `W8:Y12` (OCO 24, 28 e 1) | Perdas de estoque CB (R$ e %) | ❌ amostra de nov/26 faltando (existem out/26 e ago/26 na pasta) |
| 7 | Fill rate (`Resumo`) | digitado | Fill rate (insuficiência) DAs | planilha ✅ |
| 8 | Retorno por motivo / BI DAs | digitado | Índice de retorno por volume e por pedidos (DAs) | ❌ fonte DA a confirmar |
| 9 | Volume, cargas e pedidos dos DAs | digitado | Volume médio por carga, pedidos por carga, cargas e pedidos acumulados (Norte/Sul) | ❌ fonte a confirmar |
| 10 | TRIXLOG (portal) | digitado (ex.: 97,5 / 99,3 / 98,7) | Telemetria por unidade e frota OT | ✍️ digitado |
| 11 | Cashdrive / Green Mile (portal) | digitado | Cashdrive e Greenmile | ✍️ digitado |
| 12 | Dias úteis e trabalhados por base | digitado | Bases (DA, DL CBAR, DL CCRT, Frota OT) | ✍️ digitado |

## 4. Entradas manuais
Itens 6 a 12 da tabela, mais as metas fixas nas células:
- volume 650/600/650 cubos;
- montador 350;
- TRIXLOG 98;
- fator de cubagem `÷ 1,66` em `I7`.

## 5. Regras de cálculo
- Cubagem média por carga = volume médio ÷ 1,66. No Hub de Montagem esse fator é 1,6: o fator está divergente.
- Perdas CB R$ = Σ `VL.OPER` das ocorrências 24 + 28. Perdas % = perdas ÷ Σ ocorrência 1.

## 6. Indicadores de saída e destino
O painel em si (impressão `A1:T35`), enviado como imagem ou arquivo.

## 7. Riscos e inconsistências
- O nome do arquivo não bate com o conteúdo ("Outubro - Copia" com links de Novembro).
- Cada link externo aparece em 3 variantes de caminho (relativo, `/OPERACIONAL/…` e `file:///Z:\…`). Quebram ao trocar o mês e ao abrir fora do Z:.
- A maioria dos números dos DAs não tem trilha de origem.
- O significado das ocorrências 24 e 28 do Kardex ainda não foi confirmado.

## 8. Perguntas em aberto
1. Qual é o arquivo oficial do mês: o "Copia" ou o sem "Copia"? Quem renomeia?
2. De onde saem volume, cargas e pedidos dos DAs (BI? ERP?), e o retorno dos DAs?
3. O que significam as ocorrências 24 e 28 do Kardex?
4. Qual fator de cubagem vale: 1,6, 1,66 ou 1,68?

## 9. Situação no Hub
**Por último** (fase 8). Depende de todas as fontes acima já estarem no Hub. Assim que KM, Montadores, Perdas e 1x1 forem automatizados, o KPI passa a ler do Hub e não mais de links externos.
