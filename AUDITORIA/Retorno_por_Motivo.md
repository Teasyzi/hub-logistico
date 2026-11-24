---
title: "Retorno por motivo — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "[[MOD_Retorno_por_Motivo]]"
---
# Retorno por motivo

## 1. Objetivo e público
Explicar o retorno do mês: quanto voltou, por qual motivo e com qual motorista, nas 4 unidades.

## 2. Arquivo atual e histórico
- Atual: `Retorno por motivo\10. Retorno - Outubro.xlsx` (626 KB, fechamento de out/26).
- Histórico: `AAAA\MM.Retorno - <Mês>.xlsx`, desde jul/2025.

| Aba | Estado | Conteúdo |
|---|---|---|
| `CB NORTE`, `CB SUL` | visível | volume cx unit do mês; motivo × retorno × %; retorno por motorista em R$. **Valores colados, sem base oculta em out/26** |
| `DLS` | visível | Barreiras e Juazeiro: motivo × retorno × % (`SOMASE` em `cbar`/`ccrt`) |
| `cbar`, `ccrt` | oculta | colagem do VOLUMES DE RETORNOS / ZSD0090 do mês, só Externo (+ AP/AQ com a lista de motivos distintos, ver §10.1) |

## 3. Relatórios-fonte
| # | Relatório | Sistema | Filtros e período | Frequência | Aba | Amostra |
|---|---|---|---|---|---|---|
| 1 | `01 - VOLUMES DE RETORNOS ... .XLSX` | SAP Solar CBAR | mês fechado | mensal | `cbar` | ✅ 41 colunas idênticas |
| 2 | `ZSD0090 ... .xls` | SAP Solar CCRT | mês fechado | mensal | `ccrt` | ✅ mesmo layout |
| 3 | Devoluções por motivo e motorista dos DAs (em 2025: `Revenda, CodCli, Razão Social, Motorista, Dev Motivo, Dia_Acerto, Saída cx unit, Dev cx unit`) | Consulta BI | mês, CB CE Norte/Sul | mensal | `CB NORTE` / `CB SUL` (valores colados) | ❌ faltando |
| 4 | Volume cx unit do mês por unidade | Montagem (DLs) / BI (DAs) | mês | mensal | `E5` de cada aba | DLs via Hub; DAs ❌ |

## 4. Entradas manuais
- Tabelas dos DAs coladas como valor.
- Volume dos DAs.
- Lista de motivos distintos nos DLs (coluna AP) e, na maioria dos meses, a tabela da aba `DLS` colada como valor.
- Volume dos DLs digitado em `DLS!E5`/`S5` (deveria vir da aba `Venda` da Montagem).

## 5. Regras de cálculo
- % retorno = retorno do motivo ÷ volume do mês.
- "Total retorno s/ cancelamento NF" exclui motivos administrativos. A regra **difere entre Norte e Sul**; o Norte subtrai a constante −328 (ver MOD).

## 6. Indicadores de saída e destino
Pareto de motivos e retorno por motorista → reunião mensal. O índice de retorno também vai ao KPI e ao PES.

## 7. Riscos e inconsistências
- A base dos DAs não fica guardada (só os valores), então não dá para auditar o número.
- A regra de exclusão não é a mesma entre Norte e Sul.
- Histórico de arquivos de 179 MB (2025) por intervalo usado inflado. Em 2026 o tamanho já está normal.

## 8. Perguntas em aberto
1. Qual é a consulta do BI que dá o retorno dos DAs por motivo e motorista? Ela ainda tem o layout de 2025?
2. Qual é a regra única de motivos administrativos?

## 9. Situação no Hub
Em validação desde 24/11/2026 (`#/retorno`), ver §12. Os DLs reaproveitam `venda/` e `retorno/` da Montagem. Os DAs usam as exportações do BI (§11).

## 10. Leitura completa de jan–out/2026 (24/11/2026)
Lidas todas as células e fórmulas dos 10 arquivos de 2026 (sem os "(ANTIGO)") e conferidas contra as abas ocultas e contra a Montagem de Cargas do mesmo mês.

### 10.1 Como a planilha funciona de fato
- **DLs (aba `DLS`):** a tabela motivo × retorno é a soma de `cbar`/`ccrt!AJ` (cx unit) por `AH` (motivo do SAP). Só em jan (Juazeiro) e mar (os dois) as linhas têm `SUMIF`; nos outros meses os valores estão **colados**. A linha 6 tem um `SUMIF` modelo com o motivo vazio.
- As colunas `AP`/`AQ` das ocultas **não** são o motivo normalizado por linha: são só a lista de motivos distintos (`AQ = UPPER(AP)`) usada para montar a tabela. A ficha anterior estava errada nesse ponto.
- As ocultas têm só as linhas **Externo** (`AO`). O relatório-fonte traz Externo e Interno (Interno = cancelamento de notas, não autorizada SEFAZ, trocas, erro no pedido). Exceção: **maio**, que entrou com Interno.
- O mês é o da **Dt Remessa** (todas as linhas de cada oculta estão no mês).
- **Volume dos DLs** (`E5`/`S5`) = soma de `Cxs Unitaria` da aba oculta `Venda <DL>` da Montagem (venda bruta). O "ACM MÊS" da Montagem é a venda líquida (venda − todo o retorno), por isso não bate com este volume.
- **DAs (`CB NORTE`/`CB SUL`, ou `DAS` em jan–fev):** valores colados. Só jan/26 ainda guarda a base do BI (`norte`/`sul`: Revenda, CodCli, Razão Social, Motorista, Dev Motivo, Dia_Acerto, Dia Semana, Saída cx unit, Dev cx unit). Em jan a tabela bate exatamente com essa base, e o volume é `SUM(norte!H:H)` (saída). Linhas de "CANCELAMENTO DE NF" têm saída = devolução (a nota inteira volta).
- O "retorno por motorista" dos DAs está em **R$** e a tabela de motivos em **cx unit**: as duas não se reconciliam. A lista de motoristas tem linhas que não são pessoas ("CARGA EXTRA", "PEDIDO FUNCIONARIO").
- `Valor total incl.imp.` (`AK`) do VOLUMES DE RETORNOS é o **valor da nota inteira**, repetido em cada linha da nota (186 de 186 notas com várias linhas em out/BA). Somar `AK` por linha dá R$ 18,3 mi em out/BA: não serve para valor do retorno.

### 10.2 Erros encontrados nos DLs
| Mês | DL | Onde | O que houve | % na planilha | % correto |
|---|---|---|---|---|---|
| fev | BA | `DLS!E5` | volume 310.531,693 ≠ venda cx unit da Montagem 319.564,534 (nem cx física, 316.308,422) | 1,029% | 1,000% |
| mar | JN | `DLS!S5` | 284.877,875 digitado; Montagem 284.886,875 (9 cx) | 1,411% | 1,411% |
| abr | BA e JN | `DLS!E5`, `S5` | volume = **caixas físicas** (331.490,904 / 291.875,558) em vez de unitárias (355.274,080 / 303.811,799) | 0,656% / 1,315% | 0,612% / 1,264% |
| mai | BA e JN | `cbar`, `ccrt` | colagem com **Interno** (BA 431 linhas, 1.452,778 cx; JN 803 linhas, 4.896,583 cx) | 0,903% / 2,856% | 0,518% / 1,366% |
| ago | JN | `DLS!R8:R21` | valores colados não batem com `ccrt` em nenhuma linha; total 935,767 × 2.548,570 da oculta | 0,275% | 0,749% |
| out | JN | `DLS!Q8:R24` | falta o motivo "CLIENTE C/VASILHAMES INCOMP" (59,28 cx); a linha "FALTA DE TROCA / BONIFICAÇÃO" = 0 está no lugar | — | — |
| out | JN | `DLS!S5` | volume = **caixas físicas** 427.169,311 (unitárias: 451.169,118) | 0,979% | 0,940% |
| out | JN | `ccrt` | extração cedo: 6 linhas de remessa 30/10 processadas em 07–14/11 (588,588 cx, quase tudo "Produto com data crítica", EDI) estão na Montagem e não no Retorno | — | 1,071% com elas |

### 10.3 Erros e inconsistências nos DAs
- **Regra do "s/ cancelamento" mudou no meio do ano e difere entre Norte e Sul:**
  - jan–mai, os dois: tira só "CANCELAMENTO DE NF" do retorno e do volume.
  - Norte, jun–out: tira também "RETORNO DE CONSIGNAÇÃO" e ainda **−328** fixo do volume. Em jun a consignação foi 328,1 cx: o −328 é essa consignação digitada à mão, que ficou na fórmula e passou a ser descontada em todo mês (e em jun foi descontada duas vezes). "ERRO NA EMISSAO DA NOTA FISCAL" nunca sai no Norte (apareceu em abr, jun, jul, ago, set).
  - Sul, jun–out: tira "ERRO NA EMISSAO DA NOTA FISCAL" do retorno, mas **não** do volume (jun: 2.504,9 cx).
- **mar, `CB NORTE!E28`:** o `SUMIF` do volume vai até `C21`, mas "CANCELAMENTO DE NF" está em `C23` (518,9 cx não saem do volume).
- **ago, `CB NORTE!C8`:** o texto veio "RETORNO DE CONSIGNA€ÇO" (codificação quebrada), então o `SUMIF` não acha e os 4,2 cx não saem.
- **mai, `CB SUL!E5`:** volume 408.832,47 é o mesmo de abril (copiado). O % de maio do Sul não é confiável.
- O peso do cancelamento muda tudo no Norte: out = 1,741% com cancelamento e 0,667% sem; mai = 1,226% e 0,474%.

| Mês | Unidade | Volume | Retorno cx | % total | Cancel. NF | Consig. | Erro emissão | % s/ canc. planilha | % regra única* |
|---|---|---|---|---|---|---|---|---|---|
| jan | Norte | 560.898 | 4.904,7 | 0,874 | 1.213,3 | 0 | 0 | 0,660 | 0,660 |
| jan | Sul | 472.399 | 2.711,6 | 0,574 | 0 | 0 | 0 | 0,574 | 0,574 |
| fev | Norte | 538.214 | 3.815,1 | 0,709 | 271,1 | 0 | 0 | 0,659 | 0,659 |
| fev | Sul | 433.555 | 1.764,5 | 0,407 | 0 | 0 | 0 | 0,407 | 0,407 |
| mar | Norte | 429.598 | 3.040,2 | 0,708 | 518,9 | 0 | 0 | 0,587 | 0,588 |
| mar | Sul | 350.253 | 2.157,0 | 0,616 | 0 | 0 | 84,1 | 0,616 | 0,592 |
| abr | Norte | 524.944 | 4.025,5 | 0,767 | 305,8 | 0 | 3,7 | 0,709 | 0,708 |
| abr | Sul | 408.832 | 1.759,4 | 0,430 | 0 | 0 | 4,3 | 0,430 | 0,429 |
| mai | Norte | 534.271 | 6.549,9 | 1,226 | 4.035,4 | 0 | 0 | 0,474 | 0,474 |
| mai | Sul | 408.832 (=abr) | 1.750,3 | 0,428 | 0 | 0 | 0 | 0,428 | 0,428 |
| jun | Norte | 573.140 | 8.579,7 | 1,497 | 4.052,2 | 328,1 | 34,6 | 0,739 | 0,732 |
| jun | Sul | 488.417 | 4.453,1 | 0,912 | 141,8 | 0 | 2.504,9 | 0,370 | 0,372 |
| jul | Norte | 629.330 | 5.474,7 | 0,870 | 1.820,5 | 0 | 49,3 | 0,583 | 0,575 |
| jul | Sul | 514.446 | 1.858,5 | 0,361 | 368,8 | 0 | 0 | 0,290 | 0,290 |
| ago | Norte | 577.836 | 6.639,2 | 1,149 | 2.363,2 | 4,2 | 21,1 | 0,743 | 0,739 |
| ago | Sul | 462.768 | 2.163,5 | 0,468 | 108,8 | 0 | 8,9 | 0,442 | 0,442 |
| set | Norte | 651.653 | 5.270,3 | 0,809 | 1.369,0 | 0 | 22,4 | 0,600 | 0,596 |
| set | Sul | 546.480 | 5.550,7 | 1,016 | 3.474,6 | 0 | 23,6 | 0,378 | 0,378 |
| out | Norte | 699.590 | 12.178,6 | 1,741 | 7.563,6 | 0 | 0 | 0,667 | 0,667 |
| out | Sul | 594.726 | 4.603,8 | 0,774 | 38,1 | 0 | 0 | 0,768 | 0,768 |

\* Regra única de teste: tira cancelamento de NF, consignação e erro na emissão do retorno **e** do volume, sem o −328. Ainda não decidida.

### 10.4 Decisões pendentes (usuário)
1. Volume dos DLs: confirmar venda bruta em **cx unit** (aba `Venda` da Montagem) como denominador.
2. DLs: só **Externo**? (o Interno é cancelamento, SEFAZ e trocas).
3. DLs: qual data define o mês (Dt Remessa, como hoje) e quando extrair (as 6 linhas de 30/10 só entraram em 07–14/11).
4. DAs: regra única do "s/ cancelamento" (quais motivos saem, do retorno e do volume) e o fim do −328.
5. Qual % vai para o KPI e o PES: o total ou o "s/ cancelamento"?
6. DAs: a consulta do BI no layout de jan/26 (base `norte`/`sul`) ainda existe? Com ela o Hub calcula motivo, motorista e volume; sem ela só dá para digitar.
7. Retorno por motorista dos DAs: em R$ ou em cx unit? Nos DLs só existe valor por nota, não por linha.
8. Corrigir os meses fechados (abr, mai, ago, out dos DLs; mai do Sul) ou só seguir daqui para frente?

## 11. Decisões do usuário (24/11/2026)
1. **Volume dos DLs** = soma de `Cxs Unitaria` da aba `Venda <DL>` da Montagem (venda bruta). No Hub sai da tabela de venda que a Montagem já importa.
2. **DLs: só Externo.** O Interno (cancelamento de notas, SEFAZ, trocas, erro no pedido) fica fora.
3. **Mês = Dt Remessa.** Retorno que é processado no mês seguinte continua no mês da remessa. Reimportar o relatório depois do fechamento substitui o mês.
4. **"s/ cancelamento": sai só CANCELAMENTO DE NF**, do retorno e do volume, nos 4 centros. Acaba o −328. Motivos que já foram desconsiderados alguma vez (RETORNO DE CONSIGNAÇÃO, ERRO NA EMISSAO DA NOTA FISCAL) **contam**, mas aparecem **em observação** quando surgirem.
5. **O % oficial (KPI e PES) é o "s/ cancelamento".**
6. **DAs: fonte = duas exportações do BI**, uma linha por revenda (CB CE Norte / CB CE Sul):
   - `Revenda | Dev Motivo | Dev (Caixa Unitária)`, para a tabela de motivos;
   - `Revenda | Motorista | Dev (R$)`, para o retorno por motorista.
   - Os arquivos têm nome aleatório (GUID) e não trazem a data. O mês precisa ser escolhido na importação.
   - Os motivos vêm em "Title Case" e cortados em 30 caracteres, como antes. O Hub compara em maiúsculas.
   - Amostra de nov/26 (parcial): Norte 1.655,381 cx em 13 motivos e R$ 55.698,46 em 27 motoristas; Sul 875,432 cx em 12 motivos e R$ 30.094,76 em 22 motoristas.
   - **Nenhuma das duas traz o volume (Saída)** dos DAs. Em jan/26 ele era a soma da coluna Saída da base do BI.
7. **Retorno por motorista em R$.** Nos DLs o relatório só tem o valor da nota inteira (§10.1).
8. **Meses fechados:** o usuário corrige à mão. A lista célula por célula fica fora do repositório, em `Retorno por motivo\CORRECOES_Retorno_2026.md`.

## 12. Implementação no Hub (24/11/2026, `#/retorno`)
- **Código:**
  - `docs/js/retorno.js` (leitura e cálculo);
  - `dados_retorno.js` (Firestore);
  - `retorno_telas.js` (telas);
  - prévia em `code/tests_js/retorno.preview.html`.
- **DLs:** sem importação própria. Usam `venda/` e `retorno/` da Montagem (só `ext`, mês da Dt Remessa). O volume pode ser trocado em ⚙ Parâmetros.
- **DAs:**
  - ⚙ Importar recebe as duas exportações do BI, com o mês escolhido na tela. Também aceita a planilha antiga "MM. Retorno - <Mês>.xlsx", para trazer o histórico (motivos, motoristas e o volume `E5`).
  - O volume (Saída) é digitado em ⚙ Parâmetros.
- **Telas:**
  - Resumo com as 4 unidades (% s/ cancelamento, % total, cancelamento, volume, principais motivos) e a evolução dos meses publicados.
  - Página por unidade com o Pareto de motivos: o cancelamento aparece marcado como "fora do % s/ cancelamento" e os motivos em observação com marca.
- **Motoristas:** o retorno por motorista (R$) aparece só no rascunho do admin. A publicação leva os números e os motivos, sem nomes, como nos outros acompanhamentos.
- **Firestore:**
  - novas coleções `retorno_dados`, `retorno_parametro` e `retorno_publicado`;
  - novo documento `meta/publicacoes_retorno`;
  - as regras precisam ser publicadas no console.
- **Conferência na prévia (out/26), 16 de 16 valores iguais aos da auditoria:**
  - Barreiras 3.788,178 / 456.146,062 = 0,830%;
  - Juazeiro 4.831,290 / 451.169,118 = 1,071% (com as 6 linhas tardias que a Montagem já tem);
  - Norte (12.178,649 − 7.563,611) / (699.590,05 − 7.563,611) = 0,667%;
  - Sul (4.603,762 − 38,063) / (594.726,43 − 38,063) = 0,768%;
  - R$ por motorista: Norte 170.987,98 e Sul 188.302,60.
- **BI de nov/26 (parcial):** os totais batem com os arquivos (Norte 1.655,381 cx e R$ 55.698,46; Sul 875,432 cx e R$ 30.094,76). O Sul já mostra ERRO NA EMISSAO DA NOTA FISCAL (18,2 cx) em observação.
- **Em aberto:**
  - retorno por motorista dos DLs (o SAP não tem R$ por linha; dá para mostrar em cx unit);
  - se os leitores devem ver os nomes dos motoristas.
