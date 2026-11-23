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

## 10. Validação de outubro/26 (2026-11-23)
Comparação dia a dia entre o cálculo do Hub e a aba `Analise por dia` de `2026\2026-10\KM Planejado x Realizado - Outubro.xlsm`, importando a própria planilha (abas `Planejado *` e `Consulta`). Página: `code/tests_js/km_historico.html?mes=2026-10&arq=<url da planilha>`.

> O arquivo `KM Planejado x Realizado - Novembro.xlsm` na raiz é uma cópia de outubro ainda incompleta (Consulta de 01/10 a 28/10, salva em 09/11). Ainda não há uma planilha com os dados de novembro.

| Unidade | Planejado oficial | Planejado Hub | Realizado oficial | Realizado Hub |
|---|---|---|---|---|
| CB Norte | 159.797,35 | 159.797,35 | 173.026 | 173.026 |
| CB Sul | 86.927,53 | 86.927,53 | 97.922 | 97.922 |
| DL Barreiras | 80.493 | 80.047 (−446, FRETEIRO) | 90.086 | 90.086 |
| DL Juazeiro | 24.783 | 24.660 (−123, FRETEIRO) | 29.002 | 29.002 |

Corrigido no Hub durante a validação:
- Juazeiro: o leitor da planilha antiga usava a coluna `KM` da tabela de referência (col. V) em vez da `KM TOTAL` (col. L). O planejado saía 5.319 em vez de 24.783.
- Realizado: a planilha soma pelo `Nome Local Custo aba.` (col. M), não pelo `N. local atual` (col. L). Em 09 e 10/10, o veículo 346 (397 e 255 km) tem local FILIAL II e custo CB NORTE. O Hub passou a usar o custo, com o local como reserva.
- A importação da planilha antiga passou a gravar também os abastecimentos da aba `Consulta`.

Diferenças que ficam, porque o Hub segue a regra e a planilha não:
- **FRETEIRO no planejado:** a planilha soma as rotas de freteiro. Pela regra combinada, o Hub exclui. Em out/26: Barreiras 08/10 (329), 27/10 (84) e 29/10 (33); Juazeiro 26/10 (123).
- **Células digitadas por cima da fórmula** em `Analise por dia`. O total do mês não muda, mas o km vai para outro dia:

| Célula | Unidade | O que foi feito |
|---|---|---|
| `M5` = 0 e `N5` = 7.740 | Norte, realizado | 12/10 (539 km) somado em 13/10 |
| `J18` = 3.995 e `K18` = 0 | Barreiras, planejado | 10/10 (236 km) somado em 09/10 |
| `L19`, `M19` = 0 e `N19` = 5.030 | Barreiras, realizado | 11/10 (632) e 12/10 (408) somados em 13/10 |
| `J25` = 2.289 e `K25` = 0 | Juazeiro, planejado | 10/10 (1.193) somado em 09/10 |
| `Q25` = 1.526 e `R25` = 0 | Juazeiro, planejado | 17/10 (441) somado em 16/10 |
| `N26` = 0 e `O26` = 1.605 | Juazeiro, realizado | 13/10 (527) somado em 14/10 |

### CPK e despesa em todas as versões
- `DESPESA` e `KM` (Norte 3.459.428,90 / 1.651.492; Sul 2.604.531,38 / 1.326.094; BA 1.799.485,52 / 907.580; JN 959.142,08 / 264.353) são **os mesmos em todos os arquivos, de set/24 a out/26**. Nunca foram atualizados.
- A CPK só foi calculada a partir deles (`=despesa/km`) em 2024. Depois passou a ser digitada:

| Arquivos | Rótulo | Norte | Sul | BA | JN |
|---|---|---|---|---|---|
| set–dez/24 | CPK (fórmula) | 2,0947 | 1,9641 | 1,9827 | 3,6283 |
| jan–abr/25 | CPK 2024 | 2,0960 | 1,9848 | 1,9758 | 3,5429 |
| mai–ago/25 | CPK 2025 | 2,3912 | 2,1035 | 2,7362 | 3,4806 |
| set–out/25 | CPK FROTA ROTA ACM 2025 | 2,2635 | 1,9537 | 2,3320 | 3,4527 |
| nov/25–mar/26 | CPK FROTA ROTA ACM 2025 | 2,2589 | 1,9678 | 2,2821 | 3,4477 |
| **abr/26–out/26** | CPK FROTA ROTA ACM 2026 | **2,46** | **2,09** | **2,07** | **4,19** |

A CPK está parada desde **abril/26** (7 meses). A despesa e o km da tabela estão parados desde 2024 e não são a base da CPK atual.

### Origem da CPK (pasta `Acompanhamento de CPK's`, conferida em 2026-11-23)
- A pasta tem um `Acompanhamento CPK's - <mês>.xlsm` por fechamento. O mais recente é `2026\Acompanhamento CPK's - Fechamento Outubro.xlsm` (06/11/2026), com km lançado até **outubro/26** nas 4 unidades. As subpastas mensais de 2026 vão só até julho; agosto a outubro estão apenas dentro desse arquivo.
- Como o arquivo calcula: a aba `Resumo por unidades` dá a CPK por categoria (pneus, peças e serviços, óleo, combustível, carroceria, funilaria, lavagem, oficina) = R$ utilizado ÷ KM realizada. O total fica em **CPK TOTAL OPERACIONAL**: `D20` Norte, `M20` Sul, `D37` Barreiras e `M37` Juazeiro. O período sai da célula `B1` da aba oculta `DINAMICA` (um mês ou "ACUMULADO ANO"). As abas `DADOS *` têm uma linha "ACUMULADO ANO" por unidade.
- A KM REALIZADA de out/26 desse arquivo é igual ao realizado da planilha de KM em Sul (97.922), Barreiras (90.086) e Juazeiro (29.002). Na Norte é 176.864 contra 173.026.
- **Os valores da planilha de KM não saem desse arquivo.** 2,46 / 2,09 / 2,07 / 4,19 (digitados desde abr/26) e os de 2025 (por exemplo, 2,2635 / 1,9537 / 2,3320 / 3,4527 em set/25) não aparecem em nenhuma versão, nem no mês nem no acumulado. Também não aparecem nos arquivos de KPI e Gestão à vista de 2026.
- CPK TOTAL OPERACIONAL acumulada no ano, calculada a partir das linhas "ACUMULADO ANO":

| Arquivo | Norte | Sul | Barreiras | Juazeiro |
|---|---|---|---|---|
| Fechamento Março/26 (jan–mar) | 2,1255 | 1,7686 | 1,8536 | 3,4262 |
| Fechamento Abril/26 (jan–abr) | 2,0707 | 1,9099 | 2,0092 | 2,9695 |
| Fechamento Outubro/26 (jan–out) | **2,2663** | **2,0503** | **2,2005** | **3,4310** |

Pendente: saber com quem envia o "CPK FROTA ROTA ACM" se ele é outro recorte (só frota de rota) ou se é para usar o CPK TOTAL OPERACIONAL acumulado acima.

### FRETEIRO e troca de motorista (2026-11-23)
O Hub não exclui mais FRETEIRO sozinho. Em `#/km/rotas/<unidade>/<mês>` (só admin) dá para trocar o motorista de cada rota e marcar "Excluir". Há um botão para marcar todas as rotas de FRETEIRO de uma vez. O resumo avisa quantas rotas de FRETEIRO ainda contam no planejado. Os ajustes ficam em `km_dados/<unidade>_<mês>.ajustes`, separados das rotas, e continuam valendo depois de reimportar o dia.

### KM só com os relatórios-fonte (2026-11-23)
O site passa a montar o mês inteiro com os arquivos que já chegam, sem a planilha:

| Arquivo | O que o site faz |
|---|---|
| `MONTAGEM DAS CARGAS … CB NORTE` | lê todas as abas `DD-MM`. Cada rota guarda a seção da aba (ROTAS DO DIA, RECARGAS NA BASE, CARGAS CROSS, FINALIZANDO ROTAS, SAÍDA PARA OUTRO DIA). **Por padrão só "ROTAS DO DIA" entra no planejado.** As outras se marcam em ⚙ Rotas, por mês. |
| `MONTAGEM DAS CARGAS - CB SUL - <MÊS>` | lê as abas `DD`. O mês sai do nome do arquivo. |
| `Resumo de Planejamento - Diário - CBAR/CCRT` | um arquivo por dia. A unidade sai da célula ao lado de "Unidade" (C7). Antes, o de Barreiras era lido como Juazeiro porque cita CCRT nas abas de cross. |
| `Listagem de abastecimentos.txt` | realizado, pelo centro de custo. |
| `KM Planejado x Realizado - <Mês>.xlsm` (uma vez) | além das rotas e abastecimentos, grava o **cadastro de motoristas**: apelidos da `Planilha1`, base de cada motorista e ida e volta de cada base. Vale para todos os meses e pode ser editado em ⚙ Parâmetros. |

**Fórmulas da planilha (conferidas em out/26, 2026-11-23).** Abas `Planejado Norte` e `Planejado Sul`:
- `Q` = PROCV(MOTORISTA; Planilha1!A:B ou D:E) → nome completo. Nome fora da Planilha1 dá #N/D.
- `R` = PROCV(Q; T:U) → **base do motorista** (ÁREA). `L` repete a base.
- `I` IDA E VOLTA = PROCV(R; U:V) → km da **primeira linha daquela base**. Norte: Maracanaú 0, Canindé 0, Pentecoste 193, Quixadá 332, Morada Nova 348, Quixeramobim 420, Boa Viagem 444. Sul: todas as bases com 0.
- `M` PLANEJAMENTO = PROCV(DESCRIÇÃO DA ROTA & BASE; X:AA) → km de referência da rota para aquela base. É aqui que a descrição da rota entra: `N`/`O` marcam "VERIFICAR PLANEJADO" quando o km passa 45 da referência. Não muda a ida e volta.
- Barreiras: `O` = SOMASE(NOME; W:W; Y:Y), soma da ida e volta das linhas do motorista. Juazeiro não tem ida e volta.
- Em out/26, 26 células de IDA E VOLTA da Norte foram digitadas como **0** por cima da fórmula, sempre em motorista de base fora do CD. 18 delas são rotas em que o km da montagem já passa de ~85% da ida e volta da base (ex.: "QUIXADÁ" com 333 km), ou seja, a montagem já contou a viagem desde o CD. As outras 8 (base Quixeramobim, rotas de 46 a 251 km) não seguem regra visível.

Ida e volta de cada rota no Hub: o valor digitado na página da unidade vence (ex.: **0** quando o motorista saiu do CD); depois o valor do arquivo (planilha antiga); depois o cadastro: nome da montagem → apelido → nome completo → base → ida e volta da base. Em Barreiras, o valor próprio do motorista (a soma da planilha) vence o da base. Nome cortado em 30 letras casa pelo começo se só houver um nome completo possível. Entra uma vez por motorista no dia, já pelo nome completo. FRETEIRO, GENÉRICO e EXTRA ficam sem ida e volta. Nome que não casa fica **sem cadastro** (ida e volta 0) e aparece num aviso para o admin cadastrar. O resumo "Por motorista" também agrupa pelo nome completo.

Teste com nov/26 (`code/tests_js/km_relatorios.html`), realizado até 23/11:
- CB Norte: só "ROTAS DO DIA" dá 101.293 km planejados (58.265 de rota + 43.028 de ida e volta) contra 95.006 rodados (−6,2%). Com todas as seções, seriam 134.919 (−30%), o que confirma o padrão.
- CB Norte: 24 rotas de 2 motoristas não estão no cadastro de outubro (um é grafia diferente de um nome que existe). Elas entram sem ida e volta e aparecem no aviso "sem cadastro". Na Sul, 1 rota com só o primeiro nome do motorista.
- CB Sul: 68.778 km planejados (a ida e volta da Sul é 0 na tabela) contra 63.681 rodados. As 15 rotas de FRETEIRO (1.813 km) aguardam revisão.
- Barreiras e Juazeiro: só há o Resumo de 21/11, porque os diários de novembro ainda não foram importados.
- Outubro continua batendo com a planilha oficial após as mudanças.

### Telas novas, repetidas e remanejamentos (2026-11-23)
- **Resumo:** um card por unidade com a dispersão do mês na cor do farol (verde até ±5%, amarelo até ±10%, vermelho acima disso), planejado, realizado, diferença e custo. Embaixo, a tabela "Dispersão por dia", com uma célula colorida por unidade e dia; ao passar o mouse aparecem o planejado e o realizado. Dias sem nenhum dado não aparecem.
- **Página da unidade** (substitui as abas "Motoristas/placas" e "⚙ Rotas"): indicadores, gráfico planejado × realizado com a dispersão do dia em cima, relatório diário (rotas, km das rotas, ida e volta, planejado, realizado, diferença, dispersão, observação). Para o admin, também: rotas do dia (seção, carga, rota, placa, motorista, km, ida e volta, abastecido da placa no dia, situação, excluir), remanejamentos e observações, e o resumo por motorista e placa (Norte/Sul).
- **Rotas repetidas:**
  - *duplicada*: no mesmo dia, mesma placa (nos DLs, a carga e o motorista), mesma descrição e km com diferença de até 2%. A primeira conta; as outras saem, a não ser que o admin marque "manter". Em out/26 só a Sul tem duas assim ("ASSARE - PAGUE MENOS" em 26 e 30/10, 411 km), que a planilha oficial somou.
  - *repete dd/mm*: rota de "SAÍDA PARA OUTRO DIA" ou "FINALIZANDO ROTAS" que é a mesma (placa, descrição e km) de uma "ROTAS DO DIA" de até 4 dias de distância. Nunca conta, mesmo com a seção marcada. Em nov/26, na Norte: 3 das 5 de "SAÍDA PARA" e 39 das 56 de "FINALIZANDO".
- **Remanejamentos:** mover realizado ou planejado de um dia para outro, inclusive para o mês seguinte no fechamento (o mês seguinte recebe o km sozinho), com observação. Também dá para lançar só uma observação. Ficam em `km_dados.lancamentos`. O público vê só os números e a marca ↔ de dia ajustado, nunca o texto.
- Na planilha antiga, a "rota" da Norte e da Sul passou a ser a DESCRIÇÃO DA ROTA, e não a ÁREA MOTORISTA, que é a base do motorista.

### Ajustes pedidos em 2026-11-23 (tarde)
- **Farol:** verde quando o realizado fica igual ou abaixo do planejado; amarelo até 5% acima; vermelho além disso. Dia planejado sem nenhum abastecimento lançado aparece como "sem real.", sem cor. "Dentro da meta" passou a ser dispersão ≤ +5%.
- **Por motorista:** uma linha por motorista (placas listadas na linha). O realizado do mês de cada placa é dividido entre os motoristas que rodaram com ela, na proporção do km planejado de cada um, porque o abastecimento cobre os km desde o abastecimento anterior e não casa com o dia da rota. Abastecimentos de placas sem rota no mês viram uma linha só. Em nov/26 (Norte): 41 motoristas mais 4 placas sem rota (8.198 km), e a soma bate com o realizado da unidade.
- **Ida e volta zerada no site:** acontece quando a tabela fixa não foi importada (ela só existe no Firestore, porque o repositório é público e não pode ter nomes). A página da unidade agora avisa, e em ⚙ Parâmetros há "Importar tabela de ida e volta", que lê só as tabelas de uma planilha "KM Planejado x Realizado".

### Dia parcial, rotas com o CD no km e nomes completos (2026-11-23, noite)
- **Dia parcial fora do acumulado:** a listagem de abastecimentos tirada em 23/11 às 08:56 tinha só 3 lançamentos de 23/11. O realizado do dia da extração ainda está incompleto. Ao importar a listagem, o Hub grava esse dia (o menor entre a data do arquivo e hoje). Esse dia e o dia de hoje aparecem como **parcial** e ficam fora do acumulado, das porcentagens e do resumo por motorista, como os dias depois do último abastecimento. Reimportar uma listagem mais antiga não puxa essa data para trás. Em nov/26 (Norte), o acumulado passou a ir até 21/11, com 94.177 km planejados contra 94.235 realizados.
- **Rotas cujo km já parece incluir a ida e volta:** a rota fica marcada quando o km dela chega a 85% (ou mais) da ida e volta automática da base do motorista. É o padrão das ida e volta zeradas à mão na planilha de outubro. O Hub não zera sozinho: mostra "km já inclui?" na coluna Ida e volta, dá um filtro com esse nome em "Rotas do dia" e põe um aviso na unidade. A marca some quando o admin digita a ida e volta da rota (0 para zerar, ou o próprio valor para manter). Em nov/26, a Norte tem 11 rotas marcadas; a Sul, nenhuma, porque as bases dela são 0.
- **Nomes:** em "Rotas do dia" e em "Por motorista · mês", o motorista aparece sempre com o nome completo do cadastro, sem o nome da montagem. Quem não tem cadastro continua com o nome do arquivo e a marca "sem cadastro". Salvar sem mexer no nome não cria troca de motorista; digitar outro nome cria a troca.
- **Filtro por motorista** em "Rotas do dia". Em "Por motorista · mês", clicar no nome abre as rotas desse motorista no mês.
- **Atenção:** na mesma listagem, 19/11 e 21/11 também vieram com poucos lançamentos (4 e 10, contra uns 65 num dia normal). Eles contam no acumulado, porque só o dia da extração e o dia de hoje saem.

### Listagem de abastecimentos em .xls (2026-11-23, noite)
- **O que parecia erro de leitura:** o planejado estava acima do realizado. A comparação mostrou que o TXT era lido corretamente (o Hub soma o mesmo que o arquivo). O problema era a hora em que ele foi tirado. O TXT, tirado às 08:56, tinha 860 abastecimentos; o `KMS.xls`, tirado às 16:29 do mesmo dia, tem 967. A diferença está em 19/11 (4 → 71) e 21/11 (10 → 50), lançados no sistema depois. Um abastecimento de 23/11 também teve o km corrigido (589 → 313).
- **Até 21/11 com o .xls:** Norte 94.177 km planejados × 108.303 km realizados (+15,0%); Sul 61.709 × 70.524 (+14,3%). Com o TXT da manhã, a Norte dava +0,1%.
- **Importação:** o Hub aceita a listagem salva como `.xls`, que na verdade é uma tabela HTML em Windows-1252. As colunas são as mesmas do TXT; a unidade vem do "Nome Local Custo aba.". O `.txt` continua aceito.
- **Reimportar a listagem substitui o período que ela cobre** (do primeiro ao último dia do arquivo, em cada mês). Antes, o Hub só somava as linhas novas: um lançamento corrigido no sistema ficava duplicado (o km antigo e o novo) e um lançamento apagado continuava contando.
- **Cuidado:** os abastecimentos entram no sistema com dias de atraso. Uma listagem tirada cedo deixa dias anteriores incompletos, não só o dia da extração.
