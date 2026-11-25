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
- Atual: `Fill rate Insuficiencia - CB's Norte e Sul\11 - Insuficiência - Novembro.xlsx` (2,5 MB, parcial até 24–25/11). Out/26 já está em `2026\`.
- Histórico: `AAAA\MM - Insuficiência - <Mês>.xlsx`, desde nov/2024, um arquivo por mês.

| Aba | Estado | Conteúdo |
|---|---|---|
| `CB NORTE`, `CB SUL` | visível | cabeçalho (meta 2%, pedido entregue, falta, % fill rate, insuficiência); a partir da linha 10, a base colada (DA, categoria, código, produto, data, pedido entregue, falta) + totais por dia e por produto |
| `PRODUTOS` | oculta | cadastro de produtos do ERP com 84 colunas, ~6.470 linhas; usado só para buscar `Reduzido` |
| `Resumo` | oculta | quadro por revenda (lido pelo KPI) |

## 3. Relatórios-fonte
| # | Relatório | Sistema | Filtros e período | Frequência | Aba | Amostra |
|---|---|---|---|---|---|---|
| 1 | Insuficiência por produto e dia: `DA · Categ Prod · Prod Descr · Data · Pedido Entregue · Falta de Estoque` (CX UNIT), as duas revendas no mesmo arquivo, acumulado do mês | BI | mês, CB CE Norte e Sul | diária/mensal | `CB NORTE` / `CB SUL` (B10:H) | ✅ recebida em 25/11 (6.240 linhas, nov até 25/11) |
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
Módulo `#/fillrate` construído em 25/11 (ver §11). O cadastro de produtos (amostra 2) não é necessário: o código não entra em nenhuma conta.

## 10. Leitura completa jan–nov/26 (25/11/2026)
Lidas todas as células e fórmulas dos 11 arquivos de 2026 (`01 - … Janeiro` a `11 - … Novembro`, parcial). Não há links externos, conexões nem macros. Abas `CB NORTE` e `CB SUL` visíveis; `Resumo` oculta (só referências ao cabeçalho das duas abas); `PRODUTOS` oculta só em out e nov.

### 10.1 Layout
- **Jan–set:** B DA · C CATEGORIA · D PROD DESCR · E DATA · F PEDIDO ENTREGUE · G FALTA · H % por linha; por dia em J:K; por produto em M:N; cabeçalho em G5:N5 (meta em G5, fill rate em M3).
- **Out–nov:** entrou a coluna D `CÓD` (`PROCV(E;PRODUTOS!A:D;4;0)`) e tudo andou uma coluna (meta em H5, fill rate em N3). Foi isso que levou o arquivo de ~330 KB para 2,6 MB.
- Uma linha por DA × produto × dia, colada do relatório (ordenada pela falta, da maior para a menor). O DA vem como `CB CE Norte` / `CB CE Sul`.

### 10.2 Cálculo (igual em todos os meses)
- Entregue = `SOMA(G:G)`; falta = `SOMA(H:H)`; insuficiência % = falta ÷ (entregue + falta) (`N5`); fill rate = 1 − insuficiência (`N3`, sem rótulo); meta em caixas = 2% × entregue (`I5`); "INSUFICIÊNCIA" = falta − meta (`O5`).
- Por dia: `SOMASE(F:F;K11;H:H)`; por produto: `SOMASE(E:E;N11;H:H)`.
- O KPI (`K30:N32`) **não tem link**: o valor é digitado à mão como `=1-97,01%`. Bate com a planilha em todos os meses fechados; em mar e ago (Sul) difere 0,01 p.p. por arredondamento.

| Mês | CB Norte fill rate | CB Sul fill rate |
|---|---|---|
| jan | 97,01% | 93,44% |
| fev | 96,79% | 93,04% |
| mar | 98,41% | 94,79% (KPI 94,80%) |
| abr | 97,33% | 97,11% |
| mai | 97,96% | 98,31% |
| jun | 97,92% | 98,38% |
| jul | 96,89% | 98,15% |
| ago | 97,26% | 97,51% (KPI 97,50%) |
| set | 97,48% | 97,61% |
| out | 96,86% | 96,08% |
| nov (parcial, até 24–25/11) | 97,31% (KPI 97,23%, digitado antes) | 92,06% (KPI 91,15%) |

### 10.3 Erros e pontos de atenção
1. **Total por dia do Sul sem o dia 31** — `CB SUL!K10` (`L10` desde out) = `SOMA(K11:K40)`, mas o dia 31 fica na linha 41. Jul: 9.404 em vez de 9.614 (−210); ago: 11.580 em vez de 11.896 (−316). Só o bloco "por dia" erra; o cabeçalho e o % usam `SOMA(H:H)` e estão certos. No Norte a soma vai até a linha 1.048.576.
2. **Total por produto com intervalo fixo** — Sul `SOMA(O11:O228)` (jan: `N11:N216`), Norte `SOMA(O11:O249)`. Em nov o Sul tem produtos até a linha 239; as linhas 229–239 ficam fora do total. Hoje não muda nada (são produtos sem falta), mas qualquer produto com falta abaixo da linha 228 sumiria do total.
3. **A meta entra na soma da falta** — `SOMA(H:H)` (jan–set `SOMA(G:G)`) inclui a própria célula da meta (0,02). A falta do cabeçalho fica 0,02 maior que a soma das linhas. Irrelevante no %, mas é o motivo de `L5` ≠ `L10`.
4. **Bases diferentes no % e na meta** — o % usa entregue + falta (o pedido), e a meta em caixas usa 2% só do entregue. Em nov/Norte: 14.162 em vez de 14.554 caixas.
5. **Dias com entrega normal e falta zero** — Norte: sábados 13/06, 20/06, 05/09, 19/09, 26/09, 03/10, 10/10, 24/10, 14/11, mais 04/06 (Corpus Christi) e qui 03/09 (130 linhas, 19.739 entregues, falta 0). Sul: 14/11. Outros sábados têm falta (07/11, 21/11). A confirmar se é real ou se o relatório perde a falta nesses dias.
6. **Abril/Sul com produto repetido no mesmo dia** — 141 pares DA × produto × dia aparecem duas vezes: uma com a falta (linhas 10–226) e outra com falta ~0 e o entregue maior. Só nesse mês. A soma das duas é o tratamento certo (2,89% × 2,90% se tirar o entregue da primeira), mas vale entender o que mudou no relatório.
7. **`CÓD` com #N/D** — `PROCV` pela descrição: "Cerv Eisen Ameripa Ln 355ml Desc (Cx12)" (o cadastro tem um espaço no fim) e os itens "Repasse" não acham código. O cadastro tem 71 descrições repetidas (vale a primeira). O código não entra em nenhuma conta.
8. **Linhas soltas** — dias com 1–2 linhas e entregue ~0 (06/06, 04/07, 18/07, 31/10). Não mudam o %.
9. **Rótulo trocado** — "% FILL RATE" (`N4`) está sobre a insuficiência; o fill rate de verdade fica em `N3`, sem rótulo.

## 11. Decisões do usuário e módulo no Hub (25/11/2026)
### 11.1 Decisões
1. **Unidade:** pedido entregue e falta estão em **CX UNIT**.
2. **Falta zero é real:** quando um dia tem falta zero, havia estoque para todo o pedido. O Hub não marca esses dias como erro; só informa a contagem para o admin.
3. **Meta em CX UNIT = 2% do pedido (entregue + falta)**, na mesma base do %. A planilha usava 2% só do entregue (§10.3 item 4). O % de insuficiência não muda.
4. **Layout:** seguir a planilha, com aba **RESUMO** (o quadro da aba Resumo, mais a linha GERAL) e uma aba para **CB NORTE** e outra para **CB SUL**. Sem gráfico.
5. **Fonte confirmada:** o relatório recebido bate **linha a linha** com as abas de novembro (3.124 linhas no Norte e 3.116 no Sul, mesma ordem, mesmos valores).

### 11.2 Módulo
- Arquivos: `docs/js/fillrate.js` (leitura e cálculo), `dados_fillrate.js` (Firestore) e `fillrate_telas.js` (telas). Prévia: `code/tests_js/fillrate.preview.html?mes=AAAA-MM&arquivos=<arq1>|<arq2>&pagina=resumo|NORTE|SUL[&admin=0][&conferir=AAAA-MM]`.
- Importa o relatório (as duas revendas no mesmo arquivo) e também a planilha antiga (abas CB NORTE / CB SUL, layouts jan–set e out–nov), para o histórico. O mês sai da coluna Data; reimportar substitui o mês da revenda.
- Coleções: `fr_dados/{NORTE|SUL}_{mes}` (só admin), `fr_publicado/{u}_{mes}` e `meta/publicacoes_fr` (admin e leitores). As regras novas estão em `docs/firestore.rules` e precisam ser publicadas no console.
- Telas: RESUMO (meta %, meta CX UNIT, entregue, falta, insuficiência %, fill rate %, acima da meta, último dia; linha GERAL; abre no link); unidade com os indicadores, "Informação por dia" e "Informação por produto" lado a lado e "Informação por data e produto" com filtros (dia, categoria, só com falta, busca).
- Correções em relação à planilha: totais por dia e por produto somam todas as linhas (sem o dia 31 perdido nem o intervalo fixo), a meta não entra na soma da falta e o % aparece com o nome certo (insuficiência %, com o fill rate ao lado).

### 11.3 Conferência na prévia
Entregue e falta das duas revendas batem com a soma das linhas das planilhas oficiais (tolerância de 0,01 CX UNIT) em abr, jul, out e nov/26, importando a planilha antiga, e em nov/26 importando o relatório. Em abr/Sul o Hub soma os 141 produtos repetidos no mesmo dia, como a planilha.

### 11.4 Ajustes de tela (25/11/2026)
- "Informação por dia" mostra todos os dias, sem barra de rolagem. "Informação por produto" fica do lado com a mesma altura e rola por dentro.
- "Informação por data e produto" ganhou a coluna **Cód.**, e a busca também acha pelo código. O código vem do cadastro de produtos (colunas Descricao e Reduzido; é a aba PRODUTOS da planilha de out/26 em diante), importado em ⚙ Importar e guardado em `fr_parametro/produtos` (regra nova). Casa pela descrição, sem diferença de maiúsculas e espaços: o "Cerv Eisen Ameripa…" agora acha o código (1200153). Sem código ficam só os itens "Repasse", que não estão no cadastro (aviso para o admin). Cadastro reimportado soma ao anterior.

### 11.5 Código editável, MÊS A MÊS e exportação (25/11/2026)
- **Código à mão:** no rascunho do admin, cada código do detalhe tem um ✎. O código editado vale para todas as linhas do produto e para os outros meses, fica em vermelho e não é apagado ao reimportar o cadastro (`fr_parametro/produtos.manual`). Deixar vazio volta ao código do cadastro. Os leitores veem o código depois de publicar de novo.
- **Aba MÊS A MÊS** (`#/fillrate/comparativo/<mês>`): um bloco por mês do ano com o quadro do RESUMO (CB NORTE, CB SUL, GERAL) e o botão **Detalhes** em cada revenda, que abre a aba da revenda naquele mês (GERAL abre o RESUMO do mês); no fim, o ACUMULADO do ano (falta ÷ pedido somados). No rascunho lê `fr_resumo/{u}_{mes}` (gravado a cada importação); para os leitores, os resumos gravados em `meta/publicacoes_fr.resumos` a cada publicação.
- **Exportar planilha (.xlsx):** aba COMPARATIVO com o mesmo quadro por mês e o link "Detalhes →" para a aba de cada revenda e mês ("JAN NORTE", "JAN SUL"…), que segue o layout da planilha (cabeçalho, por data e produto com o código, por dia, por produto) e tem o link "← COMPARATIVO" no A1. Sem cores (SheetJS), com formato de número, % e data.
- Regra nova: `fr_resumo` (admin).
- Conferido na prévia com jan–out (planilhas antigas) e nov (relatório): 11 meses + acumulado; jan/26 bate com a planilha (Norte 97,01%, Sul 93,44%); a exportação gera 23 abas com os links certos.
