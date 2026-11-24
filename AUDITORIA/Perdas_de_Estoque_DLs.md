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
**Em validação** desde 2026-11-24 (`#/perdas`). Veja o §12.

## 10. Análise das fórmulas (2026-11-23)
Lidas as planilhas de nov/26 (as duas abertas), out/26 e set/26, o KPI e `Ajustes de preço - DL's.xlsx`.

### Como a planilha calcula
- **`Relatório` (MB59):** uma linha por movimento, quantidade em UN e valor em `Montante em MI` (negativo = perda).
  - MOTIVO: 551 → ESTOQUE; 928 → ROTA; 928 com referência de transferência → TRANSPORTE.
  - Cx unit = qtd (UN) × Fat.Conv2 ÷ Qtd/Un, pelo de-para `base` (material → COD CB → Qtd/Un, Fat.Conv2, categoria).
- **`Inventário`:** diferenças de inventário, quantidade em CX (caixa física), valor = dif. positiva + dif. negativa.
- **`Resumo`:**
  - Tabela por categoria: INVENTÁRIO, ROTA, ESTOQUE, "PERDAS ROTA E ESTOQUE" (G), "PERDAS TOTAL" (H = inventário + rota + estoque) e TRANSPORTE "*Informativo", fora do H.
  - Painel à direita: cx unit, % sobre o volume, custo por cx unit e total por motivo. Em Barreiras o TOTAL CUSTO (`M9`) **soma o transporte**.
  - A tabela por produto (linha 24 em diante) é colada como valor.
- **Volume do DL:** `Relatório!AB12` é digitado. É o "ACM MÊS" de volume da Montagem de Cargas (nov/26 Barreiras: 287.890,81 nos dois lugares).
- **KPI:**
  - "Perdas de estoque R$" = `Resumo!G19` (Barreiras) / `G20` (Juazeiro), que é **rota + estoque**, sem inventário e sem transporte.
  - "Perdas %" = esse R$ ÷ **faturamento "tendência vs meta"** da Montagem (projeção do mês, `D21`/`I21`), não o faturamento acumulado.
- **`Ajustes de preço - DL's.xlsx`:** um quadro anual por DL, digitado: PERDAS (= `M9` do mês, com inventário e transporte) + AJUSTE DE PREÇO = PERDAS FECH. OP.

### Diferenças e erros encontrados
1. **Cx unit do inventário está em unidades:** `T = Qtd/Un × Qtd.diferença`, mas a diferença do inventário vem em CX. O certo seria `× Fat.Conv2`. Ex.: COCA-COLA LT 350ML, −488,33 CX → a planilha dá −5.860 "cx unit"; em cx unit são cerca de −361. Em nov/26 Barreiras, o inventário pesa −10.576 dos −11.659 cx unit do mês (−4,0% do volume).
2. **Juazeiro tem regras diferentes de Barreiras:**
   - A cx unit do inventário tem o sinal invertido (`−(S×J)`), e o total de cx unit soma valores com sinais misturados (nov/26: +3.357).
   - O painel usa a coluna Referência, não o MOTIVO. Como as referências são "ESTOQUE MANUSEIO" e "ESTOQUE ESTOURO", o TOTAL CUSTO de estoque sai **0**; em nov/26 a tabela por categoria mostra R$ 6.239,84.
   - "TRANSPORTE cx unit" soma todo o tipo 928 (rota inteira).
   - O TOTAL CUSTO (`M9`) não inclui o transporte, ao contrário de Barreiras.
3. **Referência de transporte muda por DL:** "AV. TRANSF. S/N" em Barreiras; "TRANSPORTE" ou "TRANSPORTE S/N" em Juazeiro. Em Barreiras há 6 linhas 551 com "AV. TRANSF. S/N" que contam como ESTOQUE.
4. **Três "totais" diferentes:** KPI (rota + estoque), "PERDAS TOTAL" (com inventário) e `M9` / quadro anual (com inventário e transporte em Barreiras).
5. **Layout do inventário:** Barreiras ("Documento inventário, Item, …, Valor diferença pos./neg.") e Juazeiro ("Doc.inv., Itm, …, Dif.pos., Dif.neg.") usam cabeçalhos diferentes. Parecem duas transações ou dois layouts do SAP.

### Nov/26 até 23/11 (valores da planilha)
| DL | Inventário | Rota | Estoque | Rota + estoque (KPI) | Transporte | Volume cx unit |
|---|---|---|---|---|---|---|
| Barreiras | 12.240,22 | 12.401,17 | 2.397,30 | 14.798,47 | 1.896,62 | 287.890,81 |
| Juazeiro | 7.481,86 | 2.439,99 | 6.239,84 | 8.679,83 | 126,47 | 294.764,47 |

## 11. Regras do Hub: os três erros corrigidos (decisão do usuário, 2026-11-23)

### Erro 1 · Cx unit do inventário (as duas planilhas)
- **Onde:** aba `Inventário`, colunas R, S e T.
  - `R` (rótulo "QTD/UN") = `VLOOKUP(Q;base!G:J;3;0)`: a 3ª coluna de G:J é **Categoria** (ex.: "SSD").
  - `S` (rótulo "FAT.CONV2") = `VLOOKUP(Q;base!G:K;4;0)`: a 4ª coluna de G:K é **Qtd/Un** (ex.: 12).
  - `T` ("PERDAS EM CX UNIT.") = `S × J` em Barreiras e `−(S × J)` em Juazeiro. `J` é a diferença em **CX** (caixa física, UMB = CX).
- **Causa:** o índice do PROCV está uma coluna antes. O rótulo diz FAT.CONV2, mas a coluna traz o Qtd/Un. Por isso `T` sai em unidades (garrafas e latas), não em caixa unitária.
- **Certo:** `S = VLOOKUP(Q;base!G:K;5;0)`, que é o Fat.Conv2, e `T = S × J`.
- **Exemplos (Barreiras, nov/26):**
  - COCA-COLA LT 350ML: −488,33 CX × 12 = −5.860 na planilha; × 0,7397 = −361,22 cx unit.
  - CC ORIG PET 2L: −269,83 × 6 = −1.619; × 2,1134 = −570,27.
  - COCA COLA ORIG PET 1L: −298,83 × 6 = −1.793; × 1,0567 = −315,78.
- **Totais do inventário em nov/26:**
  - Barreiras: −10.576 na planilha → **−1.587,34** cx unit.
  - Juazeiro: +4.009,45 na planilha → **−526,90** cx unit.

### Erro 2 · Juazeiro calcula diferente de Barreiras
O Hub usa a mesma regra nos dois DLs, a de Barreiras:
- MOTIVO pelo tipo de movimento: 551 = ESTOQUE; 928 = ROTA; 928 com referência de transferência ou transporte = TRANSPORTE.
- Todos os painéis somam pela coluna MOTIVO.
- Perda negativa em cx unit e em R$.
- O total de custo inclui o transporte.

Diferenças na planilha de Juazeiro (nov/26):

| Célula | Fórmula na planilha | Problema | Como fica | Planilha → certo |
|---|---|---|---|---|
| `Inventário!T` | `−(S×J)` | sinal invertido: perda vira positivo (e ainda em unidades, erro 1) | `S×J`, com S = Fat.Conv2 | +4.009,45 → −526,90 |
| `Resumo!M17` (custo estoque) | `SUMIF(Relatório!N;"ESTOQUE";Q)` | a coluna N é a Referência ("ESTOQUE MANUSEIO", "ESTOQUE ESTOURO"); nunca é igual a "ESTOQUE" | `SUMIF(Relatório!S;"ESTOQUE";Q)` | 0 → −6.239,84 |
| `Resumo!P13`, `P17` (rota) | `SUMIF(Relatório!N;"ROTA";…)` | dá certo só porque a referência é exatamente "ROTA" | somar pela coluna S | igual |
| `Resumo!M20` (cx transporte) | `SUMIF(Relatório!H;928;Y)` | soma todo o tipo 928, isto é, rota + transporte | `SUMIF(Relatório!S;"TRANSPORTE";Y)` | −158,44 → −13,75 |
| `Resumo!M23` (custo transporte) | `SUMIF(Relatório!N;"TRANSPORTE";Q)` | dá certo só porque a referência é exatamente "TRANSPORTE" | somar pela coluna S | igual |
| `Resumo!M6` (total cx unit) | `SUM(M13;P13;P20;M20)` | mistura sinais e conta a rota duas vezes (dentro do M20). A célula de conferência `M3` mostra 144,69, que é a rota a mais | soma dos 4 motivos com o mesmo sinal | +3.356,63 → −1.035,02 |
| `Resumo!M9` (total custo) | `SUM(M17;P17;P23)` | sem estoque (M17 = 0) e sem transporte | `SUM(M17;P17;M23;P23)` | −9.921,85 → −16.288,16 |

### Erro 3 · Base do % de perdas no KPI
- **Na planilha do KPI:**
  - `N27 = N21 / 'Montagem das cargas'!D21` (Barreiras) e `N28 = N22 / 'Montagem das cargas'!I21` (Juazeiro).
  - `D21`/`I21` é o faturamento "TENDÊNCIA VS META": a projeção do mês inteiro.
  - O numerador `N21`/`N22` (`Resumo!G19`/`G20`, rota + estoque) é o **acumulado até o dia**.
- **Problema:** acumulado dividido por projeção deixa o % menor no começo e no meio do mês. Só fica certo no fechamento, quando a tendência = o realizado.
- **Certo:** dividir pelo faturamento **ACM MÊS** (`D20`/`I20`).
- **Nov/26 (até 23/11):**
  - Barreiras: 14.798,47 ÷ 1.160.405,58 = 1,28% → ÷ 855.035,69 = **1,73%**.
  - Juazeiro: 8.679,83 ÷ 1.140.106,85 = 0,76% → ÷ 840.078,73 = **1,03%**.

### Nov/26 com as regras corrigidas (até 23/11)
| | Barreiras planilha | Barreiras certo | Juazeiro planilha | Juazeiro certo |
|---|---|---|---|---|
| Cx unit estoque | −151,64 | −151,64 | −349,68 | −349,68 |
| Cx unit rota | −779,35 | −779,35 | −144,69 | −144,69 |
| Cx unit transporte | −152,26 | −152,26 | −158,44 | −13,75 |
| Cx unit inventário | −10.576,00 | −1.587,34 | +4.009,45 | −526,90 |
| **Total cx unit** | −11.659,24 | **−2.670,59** | +3.356,63 | **−1.035,02** |
| % sobre o volume | −4,05% | **−0,93%** | +1,14% | **−0,35%** |
| Total custo R$ | −28.935,31 | −28.935,31 | −9.921,85 | **−16.288,16** |
| Custo por cx unit | 2,48 | **10,83** | −2,96 | **15,74** |
| Perdas rota + estoque R$ (KPI) | 14.798,47 | 14.798,47 | 8.679,83 | 8.679,83 |
| % KPI | 1,28% (tendência) | **1,73%** (acumulado) | 0,76% | **1,03%** |

## 12. Módulo no Hub (2026-11-24)
- **Telas:**
  - Resumo com os dois DLs e a tabela por motivo.
  - Página de cada DL: por motivo, por categoria, por dia de lançamento e por produto.
  - Para o admin: Importar, Parâmetros e Publicar.
  - Arquivos: `docs/js/perdas.js` (leitura e cálculo), `dados_perdas.js` (Firestore) e `perdas_telas.js`.
- **Importação:**
  - MB59 bruto (Barreiras .XLSX e Juazeiro .xls): substitui os dias que o arquivo cobre.
  - Inventário (os dois layouts do SAP): substitui o do mês.
  - Planilha "AAAA - MM Perdas de Estoque - <DL>.xlsx": MB59, inventário, cadastro de produtos e volume do DL.
- **Volume e faturamento:** vêm da Montagem de Cargas do mês (ACM e tendência). Em ⚙ Parâmetros dá para digitar no lugar, e também o ajuste de preço (Perdas fech. op. = total + ajuste).
- **Regras do Firestore:** novas coleções `perdas_dados`, `perdas_parametro`, `perdas_publicado` e o documento `meta/publicacoes_perdas`. O `docs/firestore.rules` precisa ser publicado no console.

### Conferência com nov/26 (planilhas abertas, faturamento da Montagem do KPI)
- **Barreiras:**
  - Rota 12.401,17 / 779,35 cx · estoque 2.397,30 / 151,64 · transporte 1.896,62 / 152,26 · inventário 12.240,22 / 1.593,16 cx.
  - Total R$ 28.935,31 · 2.676,41 cx (0,93% do volume) · KPI 1,73%.
  - A tabela por categoria bate com a da planilha (ex.: SSD 12.176,15 / 8.815,72 / 1.502,11 / 1.720,90).
- **Juazeiro:**
  - Rota 2.439,99 / 144,69 · estoque 6.239,84 / 349,68 · transporte 126,47 / 13,75 · inventário 7.481,86 / 526,90.
  - Total R$ 16.288,16 · 1.035,02 cx (0,35%) · KPI 1,03%.
- **O MB59 bruto dá o mesmo que a aba Relatório**, com uma diferença: o de Barreiras tem 38 linhas do tipo **951 "TROCAS COMERCIAL"** (R$ 1.230,33) que não estão na planilha. O Hub mostra essas linhas à parte ("outros tipos de movimento") e não as soma.

### Outros achados na conferência
1. **Cadastro de produtos ("base") duplicado e divergente:**
   - Cada planilha tem a sua aba `base`, e elas divergem em 8 itens.
   - Em Barreiras, o de-para `1000226` (KAPO MOR TP 200ML PROMOPACK) aponta para o COD CB `1209154`. A primeira linha com esse código na coluna G (G254) é **DROP HALLS MENTOL 21UNX28G** (Qtd/Un 21, Fat.Conv2 0,10356). A linha certa do KAPO (Qtd/Un 36, Fat.Conv2 1,268064) está mais abaixo, em G314, e o PROCV nunca chega nela. Em Juazeiro o mesmo material aponta para `1924` (KAPO, certo).
   - Efeito em nov/26: a sobra de 5 CX de KAPO no inventário vira 0,52 cx unit em vez de 6,34. O total de Barreiras dá 2.676,41 cx; com o de-para corrigido, 2.670,59.
   - Em Juazeiro, `1209251` (BALA MENTOS) aparece duas vezes, com Qtd/Un 16 (G240) e 6 (G299).
   - **No Hub:** cada DL tem o seu cadastro. Em código repetido vale a primeira linha, como o PROCV. As divergências aparecem em ⚙ Parâmetros.
2. **Out/26 Barreiras contou 144 linhas duas vezes:**
   - O MB59 colado na planilha de outubro tem 144 linhas lançadas em **03/11** (documento de 29/10): rota 3.774,01 + estoque 521,80 + transporte 393,74 = **R$ 4.689,55**.
   - As mesmas 144 linhas estão na planilha de novembro.
   - **No Hub:** cada linha conta no mês da data de lançamento. Ao importar uma planilha mensal, as linhas de outro mês são ignoradas, e o resultado da importação avisa.
3. **Out/26: a tabela por categoria não bate com o Relatório:**
   - As linhas por produto (24 em diante) são valores colados.
   - Barreiras: rota 11.441,08 na tabela × 17.276,47 no painel (R$ 13.502,46 só de outubro).
   - Juazeiro: inventário 8.792,66 × 9.116,74.
   - O KPI de outubro leu `G19`/`G20` dessa tabela.

### Out/26 pelo Hub (lançamentos de outubro)
| DL | Inventário | Rota | Estoque | Transporte | Total R$ | Cx unit | % volume |
|---|---|---|---|---|---|---|---|
| Barreiras | 2.538,42 | 13.502,46 | 5.949,44 | 6.773,96 | 28.764,28 | 1.804,50 | 0,40% |
| Juazeiro | 9.116,74 | 2.827,00 | 5.146,98 | 302,00 | 17.392,72 | 916,17 | 0,21% |

## 13. O que ajustar nas planilhas (situação em 24/11)
Já corrigido pelo usuário em nov/26: Inventário R/S/T (Barreiras e Juazeiro); Juazeiro `M17`, `M20` e `M9`; KPI `N27`/`N28` (faturamento ACM).

Falta:
1. **Barreiras nov/26, aba `base`, linha 314:** trocar `B314` e `G314` de 1209154 para **1924** (KAPO MOR PROMOPACK). Total de cx unit: −2.676,41 → −2.670,59.
2. **Juazeiro nov/26, `Resumo`:** `M13`, `P13`, `P17` e `M23` ainda somam pelas colunas H e N. Dão certo hoje, mas só por coincidência. Passar todas para a coluna S (MOTIVO), como em Barreiras.
3. **Divergências de de-para entre as duas abas `base`** (7, além do KAPO): 1000361, 1001942, 1201270, 1201271, 1201272, 1201431 e 1209218. Conferir qual DL está certo.
4. **Linhas repetidas na `base` (vale a primeira):**
   - Barreiras: G99/G276, G194/G301, G127/G318 e G212/G324 (mesmos valores); A288/A304.
   - Juazeiro: G240/G299 (1209251, Qtd/Un 16 × 6), G99/G276, G211/G298 e G192/G323; A284/A296, A258/A323.
5. **Por produto (linha 24 em diante):** hoje é colada como valor. Copiar as fórmulas da linha 22 para baixo, para a tabela não ficar desatualizada, como aconteceu em out/26.
6. **Fechados (opcional):**
   - Out/26 Barreiras: apagar as 144 linhas de 03/11 do `Relatório` (R$ 4.689,55, que já estão em novembro) e acertar o Inventário R/S.
   - Out/26 Juazeiro: Inventário R/S/T e `Resumo` `M17`, `M20` e `M9`.
   - Jan–set/26: só o MB59 de out/26 Barreiras tem linhas de outro mês.

## 14. Planilhas corrigidas pelo usuário (conferência de 24/11, 16h30)
- **Aba `base` reorganizada nos dois DLs:**
  - Uma linha por material: A = COD SOLAR, B = COD CB, C = texto, D/E = PROCV na tabela de produtos.
  - Tabela de produtos em **H:L** (Reduzido, Descrição, Categoria, Qtd/Un, Fat.Conv2), sem códigos repetidos.
  - Tabela auxiliar em N:R, que as fórmulas não usam.
  - Barreiras: 321 materiais; Juazeiro: 325.
  - KAPO MOR e KAPO UVA PROMOPACK agora apontam para 1924 e 1832 (Qtd/Un 36, Fat.Conv2 1,268064).
- **Fórmulas:**
  - `Relatório` U/V/W e `Inventário` Q/R/S passaram para `base!H:K` e `base!H:L`, índices 4 e 5.
  - `Inventário` T = S × J nos dois DLs.
  - Juazeiro `Resumo`: M13, P13, M17, P17, M20 e M23 somam pela coluna S. M9 = SOMA(M17;P17;P23;M23). M3 = 0.
- **O Hub dá o mesmo que as duas planilhas, centavo a centavo:**

| | Barreiras | Juazeiro |
|---|---|---|
| Inventário R$ / cx | 12.240,22 / 1.587,34 | 7.481,86 / 526,90 |
| Rota | 12.401,17 / 779,35 | 2.439,99 / 144,69 |
| Estoque | 2.397,30 / 151,64 | 6.239,84 / 349,68 |
| Transporte | 1.896,62 / 152,26 | 126,47 / 13,75 |
| Total R$ / cx / % volume | 28.935,31 / 2.670,59 / 0,93% | 16.288,16 / 1.035,02 / 0,35% |
| Custo por cx unit | 10,83 | 15,74 |
| Rota + estoque (KPI) / % fat. ACM | 14.798,47 / 1,73% | 8.679,83 / 1,03% |

- **Entre os dois cadastros:**
  - 303 materiais existem nos dois. Só um converte diferente: **1000236 COCA-COLA PET 200ML** (Barreiras → 1011021, CX15, Fat.Conv2 0,5284; Juazeiro → 1000236, CX12, 0,42268).
  - Arredondamentos na 5ª casa do Fat.Conv2: 1000158 KUAT PET 2L, 1000576 COCA-COLA LT 350ML e 1201270 DEL VAL LIMON.
  - Em 13 materiais um DL usa o código reduzido curto e o outro o longo, com os mesmos fatores.
- **Hub ajustado:**
  - A comparação entre os cadastros usa o fator que cada material usa de fato.
  - Produto com Fat.Conv2 0 (GÁS CARBÔNICO, Juazeiro) entra na categoria, sem cx unit.

## 15. Base de referência de produtos (PRODUTOS.xlsx, 24/11)
- **O que é:**
  - Cadastro geral da distribuidora: 6.863 produtos, 84 colunas.
  - O Hub usa Reduzido (D), Descricao (C), Categoria (H, "01-SSD"), Un (L), Qtd/Un (M), Fat.Conv2 (AY) e Ativo (AJ).
  - Ficam de fora material de expediente, limpeza, manutenção, EPI, óleo, gás de empilhadeira e caminhão (categorias 80–85 e 30). Sobram 6.217 itens.
  - Fica gravada em `perdas_parametro/referencia` como um campo JSON (cerca de 350 KB).
- **Chave:** o "Reduzido" da base é o material do SAP (COD SOLAR). Ele casou com 630 dos 646 materiais dos dois cadastros de nov/26. Os fatores batem em 621.
- **Como entra no Hub:**
  - **Não entra na conta.** Para cada material sem cadastro, o Hub mostra o produto provável da base como "em observação", na página do DL e em ⚙ Parâmetros.
  - O admin confere e clica **Confirmar**, que grava no cadastro do DL (material = COD CB). Ou corrige os valores na caixa de produtos, que já vem preenchida com a sugestão.
  - Sugestão com Fat.Conv2 zerado na base (ex.: LEAO ICE TEA 300ML) não tem botão: cadastre à mão.
- **Não estão na base:** 1000226 e 1002053 (KAPO PROMOPACK), 1200097 (KAPO OLHO DO PIRATA) e, só em Juazeiro, 1200315, 1209539–1209542 (Kinder Joy, B-Ready) e 1209550–1209551 (Tic Tac).
- **Cadastro dos DLs × base de referência** (o Hub lista em ⚙ Parâmetros):

| Material | Produto | Cadastro | Base | Leitura |
|---|---|---|---|---|
| 1208935 | WHISKY JOHNNIE BLONDE VD 750ML | Qtd/Un 1 · 1,58506 | Qtd/Un 1 · 0,132 | 750 ml ÷ 5,678 L = 0,132: **o cadastro está 12 vezes maior** |
| 1208910 | VODK SMIRNOFF ICE LT 269ML | Qtd/Un 6 · 0,379 | Qtd/Un 6 · 0,28425 | 6 × 269 ml ÷ 5,678 = 0,284: **cadastro errado** |
| 1001822 (Barreiras) | CC COLOR LT 350ML PROMOPACK | Qtd/Un 1 · 0,36984 | Qtd/Un 12 · 0,73969 | por UN: 0,370 no cadastro (um pack de 6) × 0,062 na base (uma lata) |
| 1000363 | KUAT LT 350ML PROMOPACK | Qtd/Un 6 · 0,369849 | Qtd/Un 1 · 0,3698 | o contrário do anterior: por UN, 0,062 no cadastro × 0,370 na base |
| 1010408 / 1010409 | LEAO ICE TEA ZERO PET 250ML | Qtd/Un 6 · 0,26417 | Qtd/Un 12 · 0,52835 | por UN dá igual (0,044); muda só a caixa (6 × 12), que pesa no inventário |
| 1000236 (Barreiras) | COCA-COLA PET 200ML | Qtd/Un 15 · 0,5284 | Qtd/Un 12 · 0,42268 | por UN dá igual (0,035); muda só a caixa (15 × 12) |
