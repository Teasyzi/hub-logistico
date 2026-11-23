---
title: "KM planejado x realizado — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "[[MOD_KM_Planejado_x_Realizado]]"
---
# KM planejado x realizado

## 1. Objetivo e público
Medir a dispersão entre o km planejado pelas rotas e o km rodado (abastecimentos) por unidade, dia e motorista, e custear a diferença (CPK). Alimenta o KPI (bloco Frota: Quilometragem, KM planejado vs realizado, km/litro) e o fechamento mensal.

## 2. Arquivo atual e histórico
- Atual: `Analise da quilometragem planejada\KM Planejado x Realizado - Novembro.xlsm` (613 KB, **VBA**).
- Fechamento: `Fechamentos - Evolução de KM.xlsx` na raiz e uma cópia por mês em `2026\2026-MM\`.
- Histórico: `<AAAA>\<AAAA-MM>\KM Planejado x Realizado - <Mês>.xlsm`, desde 2024.

| Aba | Estado | Conteúdo |
|---|---|---|
| `Analise por dia` | visível | matriz unidade × dia (planejado = `SUMIF('Planejado X'!B, dia, J)`), totais, custo de dispersão, CPK por unidade (`AX:AZ`: despesa, km, CPK ACM 2026) |
| `CB NORTE`, `CB SUL`, `CB BAHIA`, `CB JUAZEIRO` | oculta | por motorista: km planejado, realizado, dif, % |
| `Planejado Norte`, `Planejado Sul` | visível | rotas do dia digitadas (data, rota, placa, TAG, motorista, km, ida e volta) |
| `Planejado Barreiras`, `Planejado Juazeiro` | visível | colagem do Roadnet (B:L) + colunas calculadas (ida e volta, km total, área, status) |
| `Consulta` | visível | Listagem de abastecimentos colada a partir da linha 3 |
| `Planilha1` | oculta | de-para apelido → nome completo do motorista, 4 unidades |

## 3. Relatórios-fonte
| # | Relatório | Sistema | Filtros e período | Frequência | Aba | Amostra |
|---|---|---|---|---|---|---|
| 1 | Listagem de abastecimentos | sistema de frota (TXT tabulado) | todas as unidades, 1º dia do mês até hoje | diária | `Consulta` | ✅ `Listagem de abastecimentos.txt`: **12 colunas idênticas** à aba |
| 2 | Resumo de Planejamento (aba `Resumo Geral`, linha 10+) | Roadnet (ODBC no `.xlsm`) | dia seguinte, CBAR e CCRT | diária | `Planejado Barreiras` / `Planejado Juazeiro` (B:L) | ✅ `Resumo de Planejamento - Diário - CBAR_V5.xlsm` / `- CCRT.xlsm`: as 11 colunas Carga…Distancia Planejada batem |
| 3 | `MONTAGEM DAS CARGAS <MÊS> - CB NORTE <ANO>.xlsx` / `MONTAGEM DAS CARGAS - CB SUL - <MÊS>.xlsx` (uma aba por dia, cabeçalho na linha 4: Rom, Descrição da Rota, Placa, Código do Veículo, Motorista, km…) | planilha da operação de cada DA (hoje chega pelo WhatsApp) | mês, uma aba por dia | diária | `Planejado Norte` / `Planejado Sul` | ❌ faltando. **É o mesmo arquivo S19 do Transportes 1x1** (ver `DESIGN/2026-11-16 KM design.md`) |
| 4 | Despesa de frota por unidade (para o CPK) | **origem a confirmar** (financeiro?) | mês | mensal | `Analise por dia!AX` | ❌ faltando (valor digitado) |

Colunas usadas da Listagem: `N. veículo`, `Placa`, `Data Abastec`, `Km's Percorridos`, `Nome Local Custo aba.` (CB NORTE / CB SUL / CB BAHIA / …) e, para o KPI, `Consumo (Kms/litro)`.

## 4. Entradas manuais
- Rotas de Norte e Sul (inteiras).
- De-para de motoristas (`Planilha1`), com o mesmo conteúdo também em `Transportes 1x1\Planilha1`.
- Despesa/CPK em `Analise por dia!AX:AZ`.
- Tabela de ida e volta por área (colunas T:AA das abas Planejado).

## 5. Regras de cálculo e metas
- KM total planejado = distância planejada + ida e volta da área do motorista.
- Realizado do dia = Σ `Km's Percorridos` da unidade na data.
- Dispersão = realizado ÷ planejado − 1. Custo da dispersão = dif. km × CPK.
- Status da rota: `OK` / verificar quando o planejado difere da referência.

## 6. Indicadores de saída e destino
KM planejado, realizado, dif e % por unidade/dia/motorista → KPI (P12:U16, P25:U29) e `Fechamentos - Evolução de KM.xlsx`.

## 7. Riscos e inconsistências
- A macro de importação lê de uma pasta local na Área de Trabalho de outra máquina (`...\Desktop\...\KM's Barreiras\` e `KM's Juazeiro\`).
- O nome da unidade na Listagem (`CB BAHIA`, `FILIAL I`) não é o nome usado no Hub (`DL Barreiras`). A equivalência já existe em `km.js` e foi confirmada com a amostra.
- `MOTORISTA GENERICO` no Roadnet não casa com o de-para, e o km fica sem motorista.
- Os de-paras estão duplicados entre KM e Transportes 1x1.

## 8. Perguntas em aberto
1. Quem monta o "MONTAGEM DAS CARGAS" de CB Norte e CB Sul, e de qual sistema saem as rotas e o km? Ele pode ser salvo numa pasta fixa da rede?
2. De onde vem a despesa usada no CPK (`AX3:AX6`)?

Resolvido nesta auditoria: na Listagem de 23/11, `N. local atual` / `Nome Local Custo aba.` têm 4 valores:
- MATRIZ = CB NORTE (344 linhas)
- FILIAL I = CB BAHIA, isto é, Barreiras (189)
- FILIAL II = CB SUL (265)
- FILIAL III = CB JUAZEIRO (62)

Isso é exatamente o mapa de `UNIDADES_KM` em `docs/js/km.js`.

## 9. Situação no Hub
- **Em validação.** Existem `docs/js/km.js` (com `UNIDADES_KM`), a rota `#/km` e `exportar_km.js`.
- Pendência do `TASKS.md`: validar os parsers contra outubro e novembro.
- Os layouts das amostras de nov/26 batem com o que o MOD descreve, então os parsers podem ser validados com estas amostras.
