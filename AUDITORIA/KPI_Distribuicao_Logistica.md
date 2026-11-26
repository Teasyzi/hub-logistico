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

## 10. Auditoria completa (25/11/2026)
Lidos: o arquivo do mês (`KPI Distribuição e Logística - Novembro.xlsx`, 24/11; o "Outubro - Copia" deixou de ser usado) e os 10 fechamentos de 2026.

### 10.1 O que a planilha é de fato
- **Quase tudo é valor colado ou digitado.** Em novembro só há 2 fórmulas: `N21 = [Perdas Barreiras]Resumo!G19` e `N27 = N21/'Montagem das cargas'!D20`. Os fechamentos de fev–abr e set–out não têm nenhuma; jan tem 6 e mai–ago têm 3 (`T27:T29`, % do KM).
- Os 4 links externos (Montadores, Perdas Barreiras, Perdas Juazeiro, 1x1) existem, mas só o de Perdas Barreiras é usado numa célula. Os outros números foram colados como valor.
- Layout estável desde maio/26 (jan–abr não tinham "FROTA PUXADA NORTE", "TEND." e "DIF KM").
- A aba `Montagem das cargas` é o RESUMO da Montagem colado como valor (atualizado em 23/11). Ela aparece visível em fev, abr e nov.

### 10.2 De onde vem cada número (nov/26) e o que o Hub já tem
| Bloco | CB Norte / CB Sul (DAs) | DL Barreiras / DL Juazeiro | Hub |
|---|---|---|---|
| Volume médio por carga (D7:D10) | digitado (D7 = 1.681,1) | = Montagem `CX UNIT POR CARGA` (D33/I33) ✔ | Montagem (DLs) |
| Cubagem por carga (I7:I10) | = D ÷ **1,66** | = D ÷ **1,66** (a Montagem mostra ÷ 1,6: 689,4 e 443,9) | Montagem |
| Pedidos por carga (D13:D16) | = D31 ÷ D25 ✔ | = Montagem `NOTAS POR CARGA` ✔ | Montagem |
| Volume acumulado (D19:D22) | digitado | = Montagem `ACM MÊS` ✔ | Montagem |
| Cargas / pedidos acumulados (D25:D34) | digitado | = Montagem `TOTAL CARGAS` / `ENTREGAS ACM` ✔ | Montagem |
| Retorno por volume (I13:I16) | digitado (0,26% / 0,17%) | = Montagem `RETORNO PRÉ VENDA ACM` ✔ | Retorno (DAs), Montagem (DLs) |
| Retorno por pedidos (I19:I22) | digitado | = Montagem **`REPROG CLI`** (N14/Q14) | Montagem / REPROG |
| 1x1 ajudantes por carga (H25:I28) | meta e ACM colados do 1x1 | idem | 1x1 |
| Cashdrive / Greenmile (I31:I34) | "-" | digitado (92% / 91%) | — |
| Easy Pallet /hora e /dia (N7:N16) | colado do Montadores | idem | Montadores (só no navegador) |
| Perdas R$ (N19:N22) | = Kardex OCO 24 + 28 (X10/Y10) | N21 link; N22 colado | Perdas (DLs) |
| Perdas % (N25:N28) | = R$ ÷ OCO 1 ✔ | = R$ ÷ **faturamento** ACM (Montagem D20/I20) ✔ | Perdas + Montagem |
| Fill rate (N31:N32) | digitado (2,77% / 8,85%) | — | Fill rate |
| TRIXLOG (S7:S10, S38/S43/S48) | digitado | digitado | — |
| Quilometragem + TEND. + % (S13:U16) | digitado; TEND = ACM ÷ trab × úteis ✔ | idem | KM |
| Consumo km/l (S19:S22, S40/S45/S50) | digitado | digitado | KM (verificar) |
| KM planejado × realizado (R26:U29) | **"-" em novembro** | "-" | KM |
| Dias úteis/trab./rest. (Q32:S35) | digitado (DA 23/17, Frota OT 23/17) | digitado (19/14) = Montagem D5:D7 ✔ | Montagem (DLs) |
| Frota OT JN / CBAR / Puxada (P37:T50) | digitado; TEND como acima ✔ | | KM (verificar) |

### 10.3 Problemas encontrados
1. **Fator de cubagem:** o KPI usa 1,66; a Montagem usa 1,6 e a Gestão 1,68. Para Barreiras, o KPI mostra 664,5 cubos/carga e a Montagem 689,4.
2. **Retorno por pedidos dos DLs = "REPROG CLI" da Montagem** (I21 = N14, I22 = Q14). Precisa confirmar se é esse mesmo o indicador.
3. **Metas de perdas R$ (M19:M22) com decimais quebrados** (20.709,22; 15.910,77; 11.878,11; 8.374,82): não são fórmula e não batem com meta % × faturamento do mês. Origem desconhecida.
4. **Metas do 1x1 (H25:H28) com decimais quebrados** (2,0212; 1,8518…): parecem colados do "possível" do 1x1, não meta fixa.
5. **KM planejado × realizado em branco em novembro**, e as fórmulas `T27:T29` sumiram desde setembro.
6. **N22 (Perdas Juazeiro) colado**, enquanto N21 (Barreiras) é link: o mesmo indicador entra de duas formas.
7. Os dias úteis dos DAs (23) e dos DLs (19) são digitados em dois lugares (KPI e Montagem).
8. A Gestão à vista já importa o KPI do mês (`gestao_telas.js`) para os DLs: se o KPI passar a ser do Hub, a Gestão pode ler direto dele.
### 10.4 Metas de perdas (planilha "Perdas de Estoque 2026", fora do Z:)
- Quatro abas: `Perdas - CB Norte`, `CB Sul`, `CB CBAR`, `CB CCRT`, com realizado 2024, 2025 e **META 2026** mês a mês (meta R$ = faturamento previsto do mês × %). O faturamento previsto vem de links do OneDrive (Metas BP 2026), colados como valor.
- CB Norte/Sul: linha 37 OPERACIONAL (1,1‰ / 1,0‰) e linha 41 PERDAS DE ESTOQUE = operacional + vencimentos (1,15‰ / 1,05‰). DLs: linha 31 OPERACIONAL (1% / 0,85%).
- **Erro: o KPI de novembro usa as metas R$ de OUTUBRO** (coluna L): M19 = Norte L41 (20.709,22), M20 = Sul L41 (15.910,77), M21 = CBAR L31 (11.878,11), M22 = CCRT L31 (8.374,82). As de novembro (coluna M) são 23.658,44 / 19.230,39 / 9.295,23 / 8.585,39.
- **Inconsistência nos DAs:** a meta R$ usa a linha 41 (com vencimentos), mas a meta % (M25/M26 = 1,1‰ / 1,0‰) usa a linha 37 (sem vencimentos).

### 10.5 Decisões (25/11/2026)
1. Fator de cubagem: por enquanto, o do KPI (**1,66**).
2. Retorno por pedidos dos DLs = "REPROG CLI" da Montagem (confirmado).
3. Metas de perdas: da planilha "Perdas de Estoque 2026", cada mês com a sua.
4. Metas do 1x1: variam por mês, como no 1x1 (vêm do Hub).
5. KM planejado × realizado: preencher pelo KM do Hub.
6. Perdas dos DLs: as duas vêm das Perdas do Hub.
7. Dias úteis: continuam digitados no KPI (há unidades que a Montagem não cobre).
8. A Gestão à vista passa a ler o KPI direto do Hub.
- Layout: parecido com a planilha, em cartões com bordas arredondadas.
- Exportação: igual à planilha oficial.- Metas de perdas dos DAs: ficam como no KPI (R$ = linha 41, com vencimentos; % = linha 37, operacional). Nos DLs, as duas usam a linha 31.

## 11. No Hub (26/11/2026)
- Link: `#/kpi/painel/<AAAA-MM>` (admin: ⚙ Importar e ⚙ Publicar).
- Arquivos: `kpi.js` (catálogo das células, contas, leitura dos arquivos), `dados_kpi.js`, `kpi_telas.js`, `exportar_kpi.js`; modelo `docs/modelos/kpi.xlsx` gerado por `code/tools/modelo_kpi.ps1` (só a aba LOGÍSTICA E DISTRIBUIÇÃO, sem números).
- Coleções: `kpi_dados/{AAAA-MM}`, `kpi_publicado/{AAAA-MM}`, `meta/publicacoes_kpi`.
- O que vale em cada célula: digitado > metas de perdas > automático do Hub > KPI importado > (metas) mês anterior.
- Automático: DLs da Montagem (volume ACM, cargas, pedidos, retorno por volume, REPROG CLI, faturamento ACM); retorno dos DAs (Retorno por motivo, % s/ cancelamento); perdas dos DLs (rota + estoque); quilometragem e KM planejado × realizado (KM); 1x1 (meta e realizado); fill rate (insuficiência).
- Digitado: volume, cargas, pedidos e retorno por pedidos dos DAs; Kardex (OCO. 24, 28, 1); Cashdrive/Greenmile; Easy Pallet; TRIXLOG; km/litro; dias úteis e trabalhados; frota OT; metas.
- Tela: painel em cartões, nas 4 colunas da planilha, com o farol da formatação condicional. O quadro do Kardex aparece só no rascunho.
- A Gestão à vista passa a completar com o KPI do Hub o que os outros acompanhamentos não trazem (Greenmile, Easy Pallet, km/litro, TRIXLOG).
- Conferência: o cálculo do Hub bate com set, out e nov/26 em todas as 191 células. Em jan–ago só diferem TEND./% (layout antigo) e o % de perdas dos DLs de julho (base antiga, erro conhecido).
- Exportação conferida no Excel com nov/26: 1.450/1.450 células iguais (texto, formato, farol, fonte), mesmas larguras, colunas ocultas e área de impressão. A aba "Montagem das cargas" não vai.