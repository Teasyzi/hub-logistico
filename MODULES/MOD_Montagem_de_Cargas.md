---
title: "Montagem de cargas (DLs)"
aliases: ["Montagem de Cargas - CB Logística", "Reprogramação DLs"]
type: module
domain: projects
status: review
project: "HubLogistico"
created: 2026-11-16
updated: 2026-11-17
summary: "Resumo diário de volume, cargas, ocupação, reprogramação e retorno dos DLs Barreiras e Juazeiro a partir das exportações VOLUMES DE VENDAS e VOLUMES DE RETORNOS; inclui Reprogramação e metas anuais."
tags: []
related: []
sources: ["11 - Montagem de Cargas - CB Logística.xlsm, Reprogramação DL's - 11 Novembro.xlsx, Metas Volume e Faturamento DLs e OT 2026.xlsx, Ajustes de Valores - DL's.xlsx — analisados em 2026-11-16"]
---
# Montagem de cargas (DLs)

## Responsabilidade
Acompanhar dia a dia o volume entregue (cx física e unitária), cargas, entregas, ocupação, reprogramação e retorno de LOG I (Barreiras, centro `CBAR`) e LOG II (Juazeiro, centro `CCRT`); projetar volume e faturamento do mês contra a meta. É a fonte de maior alcance: alimenta KPI, PES Logístico, Gestão à vista e Retorno.

## Arquivos
- `Montagem de Cargas/<MM> - Montagem de Cargas - CB Logística.xlsm` (mês corrente na raiz; `.xlsx` até 2026-03, `.xlsm` desde então; ~1–1,5 MB).
- `Reprogramação DL's - <MM> <Mês>.xlsx` (raiz e `2026/Reprog/`; antes em `PES/PED - Logistica/Reprogramação DL's/`).
- `Metas Volume e Faturamento DLs e OT 2026.xlsx`: volume 2023–2025, meta 2026 (= 2025 × 1,03), remuneração por cx unit, meta de faturamento, volume × frota (frota atual 19, indisponibilidade 2, necessidade de frota), abas OT Barreiras/Juazeiro. Tem link para `Resumo - Planejamentos 2026.xlsx` num OneDrive pessoal.
- `Ajustes de Valores - DL's.xlsx` / `dif. tarifa.xlsx`: fechamento CB × fechamento Solar e diferença operacional por mês.
- Histórico 2023-04 → 2026-10; `VOLUME - FATURAMENTO - TRANSPORTE - DLS <ano>.xlsx` em 2024–2025.

## Estrutura do `.xlsm`
| Aba | Conteúdo |
|---|---|
| `RESUMO` | dias úteis/trabalhados/restantes; volume AA, meta, dia anterior, ACM, tendência vs meta; faturamento (tarifa × cx unit); pré-venda; bloco de montagem por DL |
| `BARREIRAS`, `JUAZEIRO` | linha "PRÉ VENDA" (D+1), total, média e uma linha por dia com as métricas do [[12_PROJECTS/Active/HubLogistico/INDICATORS#4. Montagem de cargas (DLs, diário)\|catálogo §4]] |
| `Venda Barreiras`, `Venda Juazeiro` (ocultas) | colagem da exportação **VOLUMES DE VENDAS** |
| `Retorno Barreiras`, `Retorno Juazeiro` (ocultas) | colagem da exportação **VOLUMES DE RETORNOS** + chave deduplicada (`Dt Remessa`, `Transporte`, `Tipo de transporte`) para contar clientes |

## Automação atual (VBA)
- `ExecutarProcessoCompleto` → `Barreiras` + `Juazeiro`: procuram em `%USERPROFILE%\Downloads\` as exportações, colam como valor nas abas ocultas, deduplicam e gravam somas de conferência (`AV2:AW4`).
  - Barreiras: `*VOLUMES DE VENDAS*.xls*` e `*VOLUMES DE RETORNOS*.xls*`.
  - Juazeiro: `ZSD0092*.xls*` (vendas) e `ZSD0090*.xls*` (retornos), nomes das transações SAP da Solar.
- `Fechamento`: pede `MM/AAAA`, limpa colunas digitadas e gera o calendário do mês nas abas BARREIRAS/JUAZEIRO.
- Risco: `Dir()` pega o primeiro arquivo que casar com o padrão. Se houver dois arquivos do mesmo tipo em Downloads (ex.: o de ontem e o de hoje), a macro pode importar o errado.

## Formato das exportações (cabeçalhos)
- **VOLUMES DE VENDAS / ZSD0092** (uma linha por transporte/carga): Centro, Dt Remessa, Dt.Criac.Tp., Dt.MRP, Dt. Pco, Dia Semana, Mês, Transporte, Usuário, Carga, String, Veiculo, Canal, Qtde Pallet, Cap. Cúbica, Cap. Peso, Placa, Motorista, Motorista Nome, Parc. A1/A2, ID/Nome Motorista Pco, Supervisor, Supervisor Nome, Area, Tipo Transporte, Total Cliente, Total Notas, Cxs Fisicas, Drop Size Cxf, Cubos, Drop Size (cubo), Cxs Unitaria, Taxa Ocupação, Peso, Taxa do Peso, KM Realizado, KM Planejado, Dispersão, Status Fornecimento, Status da Pco, Duracao, Hr.Inic., Hr.Final. (Juazeiro vem com 12 linhas de cabeçalho antes da tabela.)
- **VOLUMES DE RETORNOS / ZSD0090** (uma linha por item retornado): Centro, Dt Remessa, Dt. Pco, Area, Transporte, Tipo de transporte, Cliente, Nome, Nome Fantasia, Dt.Emissão, Rota Com., Supervisor, Gerente, Diretor, Carga, Motorista, Nome Mot., Parc. A1/A2, Veiculo, Canal, Sup.Motorista, Material, Denominação, Sabor, Categoria, Embalagem, Tamanho, Nota, Motivo Cod., Motivo Nome, Cxs Fisica), Cxs Unitarias), Valor total incl.imp., Cubos, Merc.Solar, Tipo Pedido, Retorno (`EXTERNO`/interno).
- A exportação de vendas já traz **KM Realizado, KM Planejado e Dispersão** por carga: pode substituir parte do [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_KM_Planejado_x_Realizado|KM]] nos DLs (a confirmar).

## Reprogramação DL's
Abas `BARREIRAS` e `JUAZEIRO`, bloco Volume (cubos reprogramados, volume UC total, reprogramação = cubos × 1,6, %) e bloco Cliente (entregas planejadas, clientes reprogramados, %). Meta 3%. Os totais `F6` e `P6` vão para o PES Logístico. Dados digitados a partir da pré-venda.

## Entradas (confirmadas em 2026-11-16 com amostras reais)
| Fonte | Arquivo | Formato | O que alimenta |
|---|---|---|---|
| Venda Barreiras | `01 - VOLUMES DE VENDAS dd.mm.aaaa a dd.mm.aaaa.XLSX` | xlsx; números como texto (`"1883.000"`, `" 65,44%"`) | C, H (com retorno) |
| Retorno Barreiras | `01 - VOLUMES DE RETORNOS ....XLSX` | xlsx | C, H, R, S |
| Venda Juazeiro | `ZSD0092 dd.mm.aaaa A dd.mm.aaaa.xls` | **.xls binário (BIFF8)** | C, H |
| Retorno Juazeiro | `ZSD0090 ....xls` | .xls binário | C, H, R, S |
| Resumo de Planejamento | `Resumo de Planejamento - Diário - CBAR_V5.xlsm` / `- CCRT.xlsm` | xlsm (Roadnet via ODBC); **um dia por arquivo**, sobrescrito diariamente | D, E, G, I, J da Montagem; UC total, cubos e clientes REPROG da Reprogramação |
| Parâmetros do mês | digitados | — | dias úteis, volume AA, meta, tarifa, faturamento AA, meta de faturamento |

Regras do Resumo (confirmadas pelo usuário):
- `C8 = HOJE()+1`: é o planejamento do dia seguinte. Os números vão para a linha do **dia do C8**. A linha PRÉ VENDA é cópia da linha do último Resumo.
- O arquivo deve ser aberto **sem habilitar edição** para o C8 não recalcular. O Hub lê o valor salvo e avisa se a data for anterior à última remessa importada.
- Montagem: Entregas = `G8`, Cargas = `H8`, Tx ocupação = `J8`, Vol reprog = `L8` (= cubos de REPROG + REPROG_AGEND + REPROG_PERNOITE × 1,6), Cli reprog = `M8` (as 3 categorias).
- Reprogramação DL's: UC total = `N8`, Entregas plan = `G8`; cubos e clientes **só das linhas com Carga = `REPROG`** na aba `Paradas` (sem REPROG_AGEND e REPROG_PERNOITE).
- Dias trabalhados contam normalmente os dias com entregas. Ajustes por sábado que não deve contar como dia útil são manuais no parâmetro `Ajuste manual de dias trabalhados` (ex.: `-1` ou `-2`).

## Implementado no Hub (2026-11-16)
Código em `12_PROJECTS/Active/HubLogistico/code/` (Python 3, só biblioteca padrão). Ver [[12_PROJECTS/Active/HubLogistico/README|README]] para executar.
- Importadores reconhecem o arquivo pelo conteúdo: venda, retorno, Resumo e as planilhas antigas de Montagem/Reprogramação (para carregar o histórico de 2026).
- Substituição por **transporte**: reimportar o acumulado do mês não duplica.
- Indicadores diários, totais, médias, RESUMO (tendência, faturamento) e Reprogramação replicam as fórmulas da planilha.
- App local: painel principal, resumo das 2 DLs, detalhe por DL (gráficos diários, tabela diária, reprogramação, Pareto de motivos), formulários de parâmetros e de planejamento manual, tela de importação, exportação HTML estática.
- **Validação**: jan–nov/2026, cerca de 4.500 valores diários conferidos contra as planilhas salvas. Bate em C, D, E, G, H, I, J e R, exceto nos casos abaixo.

## Problemas encontrados nas planilhas atuais
| # | Onde | O que acontece | Efeito | Hub |
|---|---|---|---|---|
| 1 | `Reprogramação DL's - 11 Novembro`, aba BARREIRAS | coluna E deslocada uma linha a partir de 07/11 (`E13=C14*1,6`, `E14=C15*1,6`, `E15=C16*1,6`) | % reprog volume nov/26 = 1,99% na planilha × **1,74%** correto (vai para o PES) | calcula certo |
| 2 | Montagem, coluna S (% retorno cliente) | `RemoveDuplicates` não remove transporte repetido quando um vem como texto e outro como número; a carga é contada 2× | S do dia superestimado em ~1 carga (ex.: 03/11 CBAR 5 × 4) | conta transportes distintos |
| 3 | Montagem, coluna S | conta **cargas** cujo 1º item de retorno é externo e divide por **entregas** (clientes) | mistura unidade de medida | mostra o da planilha e, ao lado, clientes com retorno externo ÷ entregas |
| 4 | Juazeiro, `AQ/AR` de Retorno | `VLOOKUP` em `'Venda Juazeiro'!$H$2:$H$12` (vazio desde que o cabeçalho foi para a linha 13) | sempre devolve o retorno inteiro (efeito igual a Barreiras) | regra única: venda − todo retorno |
| 5 | Exportações mensais | transporte reagendado aparece com Dt Remessa diferente em dois arquivos (ex.: 5135095: 31/10 no de outubro, 03/11 no de novembro) | a planilha mensal conta a carga nos dois meses | conta uma vez, na data mais recente (diferenças em 31/10 CBAR, 05/06, 09/07, 11/07, 14/07 e 25/04 CCRT) |

## Pendências
- Decidir se o ACM deve incluir o volume do dia da pré-venda, já que os dias trabalhados não o contam (a tendência fica ~1 dia acima).
- Confirmar com a Solar a definição de "% retorno cliente" (item 3).
- Carregar o arquivo de Reprogramação de janeiro (não estava no zip; jan/2026 fica sem cubos REPROG).
