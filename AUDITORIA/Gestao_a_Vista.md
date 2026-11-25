---
title: "Gestão à vista (DLs) — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-25
mod: "[[MOD_Gestao_a_Vista]]"
---
# Gestão à vista (DLs)

## 1. Objetivo e público
Quadro anual dos dois DLs, com cerca de 40 indicadores mensais: volume, cargas, pedidos, retorno, produtividade, perdas, custo de distribuição, frota e empilhadeiras. Cada indicador tem o acumulado do ano e um gráfico. A planilha compara o ano corrente com os anos anteriores.

## 2. Arquivo atual e histórico
- Pasta `Gestão à vista\<AAAA>\`, uma planilha por DL e por ano:
  - `GESTÃO À VISTA - CB LOG CBAR.xlsx` (Barreiras);
  - `GESTÃO À VISTA - CB LOG II CCRT.xlsx` (Juazeiro);
  - 2024 com "2024" no nome.
- 2026: alterada pela última vez em 05/08/2026. **Só tem jan–jun/26.** Os custos (distribuição, manutenção, pneus, empilhadeiras) só vão até abr/26.
- Sem VBA, sem Power Query e sem link externo. Tudo é digitado ou é fórmula interna.
- Abas (iguais nos quatro arquivos de 2025 e 2026):
  - `Dados` (A1:BV48): a única com números.
  - 13 abas só de gráfico (28 gráficos): `Volume`, `Cubos`, `Retorno e QTA`, `Cargas e Pedidos`, `Easy Pallet`, `Easy Pallet (2)`, `Perdas Estoque`, `Custo Dist`, `KM`, `Des Motoristas`, `Manut Frota`, `Empilhadeiras`.
  - `PLAN 2024` (oculta): projeção de 2024 quebrada, toda em `#REF!`. Não é usada.
- Layout da aba `Dados`:
  - linha 3 = meses;
  - colunas B:M = ano corrente, O = "Acum";
  - Q:AB + AD = ano anterior; AF:AQ + AR = dois anos antes, e assim por diante.
  - Os gráficos usam só `Dados!B:O` do ano corrente: jan–dez, a coluna N vazia e o "Acum".

## 3. Origem de cada número (conferido jan–jun/26 contra os KPIs mensais fechados)
Tudo é digitado. Nenhum número vem de um relatório bruto: os valores são copiados do KPI do mês, da Montagem e de outras fontes.

| Linha | Indicador | Origem | Conferência jan–jun/26 |
|---|---|---|---|
| 4 | Dias úteis | KPI `Q33`/`Q34` (Montagem) | bate nos 6 meses |
| 5 | Faturamento DL | Montagem RESUMO (cópia na aba oculta do KPI, `D20`/`I20`) | bate |
| 6 | Volume CX UNIT | KPI `D21`/`D22` | bate, exceto abr Barreiras (350.253 × 350.006) e mar (arredondado) |
| 7–8 | Volume por dia / por carga | fórmulas (linha 6 ÷ dias, ÷ cargas) | bate |
| 9–11 | Cubos (mês, dia, carga) | fórmula `volume/1,68` | ≠ KPI, que usa **1,66** (diferença de ~1,2%) |
| 12 | Ocupação cubagem | Montagem RESUMO (`D28`/`I28` da cópia no KPI) | bate |
| 13 | Retorno (volume) | KPI `I15`/`I16` (Montagem) | bate, exceto abr (Barreiras 0,57% × 0,61%; Juazeiro 1,22% × 1,28%) |
| 14 | Retorno (clientes) | KPI `I21`/`I22` ("por pedidos") | só a partir de mai/26; jun Barreiras errado (ver §7) |
| 15 | Ajudantes por carga | KPI `I27`/`I28` (1x1) | bate |
| 16 | Green Mile | KPI `I33`/`I34` (digitado no KPI) | bate |
| 17–18, 20 | Easy Pallet cx misto, pallet, tempo de montagem | — | sempre "-" desde 2024 |
| 19 | Easy Pallet cx/montador/hora | KPI `N9`/`N10` (Montadores) | bate (arredondado em alguns meses) |
| 21, 23 | Cargas, pedidos | KPI `D27`/`D28`, `D33`/`D34` (Montagem) | bate |
| 22, 24, 25 | Por dia / por carga | fórmulas | bate |
| 26 | Perdas estoque R$ | planilha de Perdas, `Resumo!H` (**PERDAS TOTAL**, com inventário) | bate só em jun; ≠ KPI em todos os meses (o KPI usa rota + estoque) |
| 27 | "Perdas estoque DL (R$)" | fórmula perdas ÷ faturamento (é %, não R$) | — |
| 28 | Custo distribuição DL | **sem fonte na pasta** (financeiro) | jan–abr/26 |
| 29–30 | % sobre faturamento, por CX UNIT | fórmulas | — |
| 31 | KM frota | KPI `S15`/`S16` (KM) | bate |
| 32–33 | KM por carga, "consumo" | fórmulas (33 = km ÷ km/l = litros) | — |
| 34 | km/litro | KPI `S21`/`S22` | bate |
| 35 | TRIXLOG | KPI `S9`/`S10` (digitado no KPI) | bate |
| 36, 38, 40 | Manutenção, corretiva, pneus | **sem fonte na pasta** (manutenção) | jan–abr/26 |
| 37, 39, 41 | Por km | fórmulas | — |
| 42, 44, 45 | Empilhadeiras: horas, horas/tanque, custo | **sem fonte na pasta** | Barreiras: só jan/26 (18 h); Juazeiro: jan–abr/26 |
| 43, 46 | "Consumo" (tanques), custo/hora | fórmulas | — |

## 4. Entradas manuais
- Todas as linhas sem fórmula (4–6, 12–19, 21, 23, 26, 28, 31, 34–36, 38, 40, 42, 44, 45).
- Fator de cubos 1,68 fixo nas fórmulas (o KPI usa 1,66; a Montagem usa 1,6).
- "Acum" do TRIXLOG (`O35`) digitado: 99,5, nos dois DLs e nos dois anos. Não é a média.
- Fórmulas apagadas e trocadas por valor: Barreiras mai/26 `F8` e `F11` (o `F11` = 612, o valor do KPI com 1,66).

## 5. Regras de cálculo
- O "Acum" é a **média** dos meses (`AVERAGE(B:M)`). Nos indicadores de razão, ele é a razão das médias (`O10 = O9/O4`, `O11 = O9/O21`, `O27 = O26/O5`).
- Indicadores derivados: volume/dia, volume/carga, cubos = volume/1,68, cargas/dia, pedidos/dia, pedidos/carga, perdas/faturamento, custo/faturamento, custo/CX UNIT, km/carga, litros = km/(km/l), custos por km, tanques = horas/(horas/tanque), custo empilhadeira/hora.
- Não há metas na planilha.

## 6. Indicadores de saída e destino
- Os gráficos (abas de gráfico) são impressos ou mostrados na gestão à vista dos DLs.
- Nada sai da planilha para outro acompanhamento.

## 7. Riscos e inconsistências (com célula)
1. **Perdas de Juazeiro jan–mar/26 copiadas de Barreiras.**
   - `JN26 Dados!B26:D26` = 30.189,59 / 10.925,33 / 32.001,58, exatamente os mesmos de `BA26 Dados!B26:D26`.
   - O KPI de Juazeiro desses meses tem 5.651,05 / 8.136,83 / 5.877,27.
2. **As perdas não seguem uma regra única.**
   - Jun/26 = "PERDAS TOTAL" da planilha de Perdas (`Resumo!H19` Barreiras 13.572,02; `H20` Juazeiro 19.667,62), com inventário.
   - Jan–mai/26 não aparecem em nenhuma célula das planilhas de Perdas atuais. Elas foram corrigidas depois, ou os valores vieram de outra versão.
   - O KPI usa rota + estoque (ex.: jan Barreiras 18.562,25 × 30.189,59 na Gestão à vista).
3. **Cargas de dez/25 em Barreiras:** `BA25 Dados!M21` = **3.936** (o normal é ~340).
   - Isso derruba o volume por carga de dez (113,9), os cubos por carga (67,8), os pedidos por carga (2,2) e o km por carga (23,7), e infla as cargas/dia (187,4).
   - O erro vai junto para o acumulado de 2025 (média de cargas 621,2) e para a coluna `AB` da planilha de 2026.
4. **Média do acumulado com meses vazios.**
   - Cubos: `O9 = AVERAGE(B9:M9)`, e os meses jul–dez valem 0 (a fórmula `M6/1,68` dá 0, não vazio). Barreiras 2026 mostra 103.140 em vez de ~206.280. Por isso `O10` e `O11` também saem pela metade.
   - Custos/%: `F29:G30`, `F37:G41` valem 0 (mai–jun sem custo), e entram na média: `O29` 52% em vez de ~79%; `O30` 1,42 em vez de ~2,14.
5. **Retorno (clientes) jun/26 Barreiras:** `BA26 G14` = 3,48%, mas o KPI de junho tem 1,32%. Abr/26 tem valor no KPI (1,12% / 1,27%) e ficou "-" na Gestão à vista.
6. **Abril/26 digitado antes do fechamento:** o volume e o retorno de abril diferem do KPI fechado.
7. **Juazeiro 2026 sem o ano anterior:** `JN26 Dados!Q:AB` traz 2024 (e não 2025); `AF:AQ`, 2023. Em Barreiras 2026, `Q:AB` = 2025 (igual à planilha de 2025).
8. **Rótulos trocados ou confusos:**
   - "PERDAS ESTOQUE DL (R$)" (linha 27) é %.
   - "CONSUMO FROTA" (linha 33) é litros.
   - "CONSUMO" (linha 43) é número de tanques.
   - "CUSTO DISTRIBUIÇÃO DL (% SOBRE FATURAMENTO)" dá 72–88% (o "faturamento DL" deve ser outra base; ver P-GV-4).
9. **Linhas mortas:** Easy Pallet cx misto, pallet e tempo de montagem (17, 18, 20) estão sempre "-".
10. **Empilhadeiras de Barreiras:** as horas caem de 397 (jan/25) para 69 (dez/25), 18 em jan/26 e 0 depois. Uma empilhadeira saiu? É elétrica?
11. **Fatores de cubos diferentes:** 1,68 aqui, 1,66 no KPI e 1,6 na Montagem.
12. **`PLAN 2024` oculta** está quebrada (`#REF!`).

## 8. Perguntas em aberto
- P-GV-1: A Gestão à vista parou em jun/26 (custos em abr/26). Ela ainda é usada? Quem vê e como (impressa, TV, reunião)?
- P-GV-2: Os custos (distribuição, manutenção, corretiva, pneus, empilhadeiras) vêm de qual relatório? Quem envia?
- P-GV-3: Qual perda vale: rota + estoque (como o KPI) ou o total com inventário (como em jun/26)?
- P-GV-4: O "faturamento DL" é a base certa para o custo de distribuição (dá 72–88%)?
- P-GV-5: Cubos com qual fator (1,68, 1,66 ou 1,6)?
- P-GV-6: O "Acum" deve ser a média dos meses fechados (sem os vazios) ou o total do ano ÷ meses?
- P-GV-7: As linhas mortas (Easy Pallet misto/pallet/tempo) saem?
- P-GV-8: TRIXLOG "Acum" = 99,5 fixo: é a meta?

## 9. Situação no Hub
- Ainda não automatizado.
- A maioria dos números já sai de módulos do Hub (Montagem, KM, Perdas, 1x1, Montadores) ou do que hoje é digitado no KPI (Green Mile, TRIXLOG).
- Só os custos e as empilhadeiras precisam de fonte nova.

## 10. Decisões do usuário (25/11/2026)
1. **Uso:** a planilha continua em uso. Ela não foi atualizada depois de jun/26. O próprio usuário a preenche, a partir do KPI, da Montagem e das Perdas (PERDAS TOTAL, depois do fechamento), além de outras informações.
2. **Custos e empilhadeiras:** quem preenche é outra pessoa, e hoje o usuário não tem acesso a esses dados. No Hub, esses números ficam digitáveis pelo admin.
3. **Perdas:** na Gestão à vista vale a **perda total da unidade** ("PERDAS TOTAL", com inventário), depois do fechamento. O KPI continua com rota + estoque.
4. **Base do custo de distribuição:** a resposta está em aberto (ver P-GV-4, reformulada).
5. **Cubos:** fator **1,68**.
6. **"Acum":** é a média só dos meses com dado. Os meses vazios não entram.
7. **Linhas do Easy Pallet sempre "-"** (17, 18, 20): continuam, por enquanto.
8. **TRIXLOG "Acum":** o 99,5 fixo é um erro. O certo é a média do desempenho acumulado até o mês.
