---
title: "Transportes 1x1 — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "(novo: não havia MOD; o TASKS.md pedia esta pasta)"
---
# Transportes 1x1 (ajudantes por carga)

## 1. Objetivo e público
Projeto 1x1: medir se cada carga saiu com o número certo de ajudantes. A regra é 1 ajudante até a meta de cubagem e 2 acima dela, com tolerância de +5%. Compara os ajudantes possíveis com os realizados por dia e por motorista. Vai para o KPI ("Projeto 1x1 ajudantes por carga").

## 2. Arquivo atual e histórico
- Atual: `Transportes - 1x1\11 - Acompanhamento de transportes - 1x1 - Novembro.xlsx` (141 KB) e `11 - PARTICULARIDADES - Acumulado mês.xlsx` (33 KB).
- Histórico: `2026\MM - Acompanhamento ... - <Mês>.xlsx` e `2026\MM - PARTICULARIDADES - Acumulado mês.xlsx`, mais `2025\2025-MM - Particularidades\`. Desde 2024.

| Aba | Conteúdo |
|---|---|
| `RESUMO` | por unidade: meta + 5%, dia anterior, realizado, dif.; meta de cubagem **450** por unidade |
| `DA - CB Norte`, `DA - CB Sul` | por carga: data, descrição da rota, placa, código do veículo, motorista, ajudantes, cubagem; possíveis = `SE(cubagem ≤ meta; 1; 2) × 1,05`; médias por dia e por motorista |
| `DL - CB Barreiras`, `DL - CB Juazeiro` | igual, sem rota/placa (data, motorista, ajudantes, cubagem) |
| `Planilha1` (oculta) | de-para apelido → nome completo do motorista (4 unidades), duplicado do KM |
| PARTICULARIDADES: uma aba por unidade, `<UNIDADE> - <supervisor>` | exceções do mês por supervisor (mesmas colunas + OBSERVAÇÃO) |

## 3. Relatórios-fonte
| # | Relatório | Sistema | Filtros e período | Frequência | Aba | Amostra |
|---|---|---|---|---|---|---|
| 1 | "MONTAGEM DAS CARGAS <MÊS> - CB NORTE <ANO>.xlsx" (cargas do dia com placa, motorista, ajudantes, cubagem) | planilha da operação, **recebida pelo WhatsApp**; o mesmo arquivo dá as rotas do KM Norte/Sul | dia | diária | `DA - CB Norte` (há **link externo** para o arquivo na pasta temporária do WhatsApp) | ❌ faltando |
| 2 | Idem para CB Sul | idem? | dia | diária | `DA - CB Sul` | ❌ faltando |
| 3 | Cargas e ajudantes DLs: cubagem por carga | Montagem de Cargas / Roadnet (`Resumo Geral`: Carga, Cubos, Nome Motorista) + nº de ajudantes informado pela base | dia | diária | `DL - CB Barreiras` / `DL - CB Juazeiro` | cubagem ✅ (Resumo de Planejamento); ajudantes ❌ |
| 4 | Particularidades | supervisor de cada unidade | mês | ao longo do mês | arquivo PARTICULARIDADES | ✍️ digitado |

## 4. Entradas manuais
- Número de ajudantes por carga em todas as unidades.
- Meta de cubagem de 450.
- Tolerância de 5%.
- De-para de motoristas.
- Particularidades.

## 5. Regras de cálculo
- Possíveis = `SE(cubagem ≤ meta; 1; 2) × 1,05`.
- Dif = ajudantes − possíveis.
- Média do mês = média de possíveis × média de ajudantes. Indicador: realizado ÷ meta − 1.

## 6. Indicadores de saída e destino
`RESUMO` → KPI (link externo `RESUMO!C/E`).

## 7. Riscos e inconsistências
- **Link externo para um arquivo na pasta de downloads temporários do WhatsApp Desktop** (`C:\Users\<usuário>\AppData\Local\Packages\...WhatsAppDesktop...\transfers\...\MONTAGEM DAS CARGAS NOVEMBRO - CB NORTE 2026 (1).xlsx`). É uma pasta temporária, de uma pessoa e de uma máquina, que o WhatsApp limpa. É o risco mais alto da auditoria.
- O de-para de motoristas está duplicado com o KM.
- O nº de ajudantes não vem de sistema nenhum.

## 8. Perguntas em aberto
1. Quem gera o "MONTAGEM DAS CARGAS – CB NORTE/SUL" e de qual sistema saem placa, motorista e cubagem?
2. Esse arquivo pode ser salvo numa pasta fixa da rede em vez de vir pelo WhatsApp?
3. A meta de 450 cubos vale para as 4 unidades?
4. As particularidades corrigem o indicador (excluem cargas) ou são só informativas?

## 9. Situação no Hub
- **Não documentado e não implementado.**
- Proposta: os DLs saem do Roadnet, que já é importado. Os DAs dependem da amostra 1/2.
- O nº de ajudantes pode ser digitado no próprio Hub (tela de lançamento por carga), o que substitui o arquivo do WhatsApp.

## 10. Leitura completa de jan–nov/2026 (25/11/2026)
Lidos célula por célula (fórmulas e valores, inclusive a `Planilha1` oculta) os 11 arquivos de 2026, mais os de PARTICULARIDADES. Também foram comparados com as montagens Norte/Sul de novembro (amostra em `Relatorios fonte`) e com o KPI de novembro.

### 10.1 Como a planilha calcula
- **Por carga:** POSSÍVEIS +5% = `SE(cubagem ≤ meta; 1; 2) × 1,05`, ou seja, 1,05 ou 2,1. DIF = ajudantes − possíveis.
- **Meta de cubagem:** 450 nos DAs (Norte e Sul) e **400 nos DLs** (Barreiras e Juazeiro), em `RESUMO!H7:H10`. Isso responde a P-3 da §8: a meta não é a mesma para as 4 unidades.
- **Unidade:** META = média dos possíveis de todas as cargas (`H5`/`E5`). REALIZADO = média dos ajudantes (`I5`/`F5`). DIF = realizado ÷ meta − 1.
- **RESUMO:** C = meta, E = realizado, F = dif. A linha GERAL é a média de todas as cargas das 4 unidades, ponderada pelo nº de cargas.
- **KPI** ("PROJETO 1X1 AJUDANTES POR CARGA"): META = `RESUMO!C7:C10` e ACM = `RESUMO!E7:E10`. São médias de ajudantes por carga, não %.
- **Quadros auxiliares:** "por dia" (N:R / K:O) e "por motorista" (T:X / Q:U). Não entram no RESUMO.
- **"Dia anterior"** (`N3:R3` / `K3:O3`) é digitado, e é ele que vai para `RESUMO!D`.
- **Motoristas:** a `Planilha1` (oculta) é o de-para apelido → nome. Norte em D:E, Sul em G:H, Barreiras em A:B, Juazeiro em J:K.

### 10.2 Erros e pontos de atenção
1. **Possíveis digitados por cima da fórmula (o principal):** em 2026 foram 1.894 cargas com o POSSÍVEIS digitado. Em 1.854 delas o valor digitado difere da regra.
   - Em 1.770 o caso é o mesmo: a carga estava abaixo da meta de cubagem (regra 1,05), saiu com 2 ajudantes e o possível foi trocado para 2 ou 2,1. O excesso foi abonado.
   - O valor digitado varia (791 vezes 2 e 947 vezes 2,1), e nenhuma célula diz o motivo.
   - O efeito é uma meta maior e um indicador melhor:

| Mês | Norte (planilha → regra) | Sul | Barreiras | Juazeiro | possíveis digitados ≠ regra |
|---|---|---|---|---|---|
| jan | -2,70% → -1,09% | -2,04% → 0,76% | -4,75% → 4,45% | -1,93% → 5,40% | 143 |
| fev | -2,19% → 0,52% | -4,32% → -1,97% | -1,76% → 6,76% | 1,44% → 11,74% | 137 |
| mar | -0,95% → 6,56% | -2,98% → 7,46% | 0,70% → 8,87% | 15,03% → 30,09% | 337 |
| abr | -2,73% → 2,71% | 0,69% → 6,54% | -5,46% → -0,12% | 2,90% → 20,95% | 237 |
| mai | -3,30% → 2,98% | -2,36% → 1,75% | -6,06% → -0,50% | -0,60% → 14,02% | 211 |
| jun | -0,31% → 4,23% | -3,44% → 1,37% | -6,78% → -2,11% | 2,98% → 11,35% | 158 |
| jul | 0,22% → 5,37% | 0,51% → 4,28% | -5,07% → 1,19% | -2,06% → 9,29% | 202 |
| ago | -1,64% → 2,12% | -0,93% → 4,59% | -9,05% → -4,43% | 1,12% → 15,81% | 191 |
| set | -2,03% → 0,95% | -2,09% → 3,86% | -5,68% → -2,23% | 4,90% → 8,50% | 133 |
| out | -0,19% → 1,32% | 4,77% → 7,49% | -5,99% → -4,45% | 5,04% → 8,20% | 75 |
| nov (até 17/11) | -2,11% → -1,42% | 2,04% → 3,29% | 0,86% → 1,17% | 3,15% → 8,49% | 30 |

   "Regra" = o mesmo cálculo da planilha, mas com o possível de toda carga pela fórmula e só com as cargas que têm ajudantes lançados.

2. **Link para a pasta do WhatsApp:** em novembro, `'DA - CB Norte'!H297:H298` leem a cubagem de `'[1]16-11'!H8:H9`. Esse arquivo é a montagem Norte, na pasta temporária do WhatsApp Desktop. Em H298 o resultado é 1,05, mas a cubagem da própria linha (J298 = 539,59) dá 2,1. Setembro também tem link externo.
3. **Cargas sem ajudantes contam na meta:** em novembro, `'DA - CB Sul'!I316:I319` (dia 17/11) estão vazias, mas os possíveis delas entram na média de H5. A meta usa 330 cargas e o realizado só 326. Junho, no Sul, tem 1 caso.
4. **Montagem × 1x1, DAs, novembro:**
   - **Norte:** 344 de 373 cargas acham par na montagem, pela data e placa.
     - Cubagem igual em 339. As diferentes são as cargas de atacarejo sem cubagem na montagem, que no 1x1 têm cubagem digitada (900, 1.160, 2.034).
     - Ajudantes iguais em 343.
     - As que faltam são do dia 14/11, que não tem aba na amostra.
     - O 1x1 Norte também leva parte das "RECARGAS NA BASE" e "CARGAS CROSS" da aba do dia anterior, escolhidas à mão. Muitas delas não têm ajudantes na montagem.
   - **Sul:** 305 de 330 acham par; as que faltam são do dia 03/11, que não tem aba na amostra.
     - Em 10 cargas, o 1x1 junta duas linhas da montagem do mesmo veículo numa só ("A|B"), somando a cubagem.
     - Em 16/11 a montagem não tem a coluna Ajudantes preenchida, e o 1x1 tem.
     - Mais 6 cargas com ajudantes vazios na montagem também têm ajudantes no 1x1.
5. **DLs:** o 1x1 usa a cubagem em número inteiro e o nome curto do motorista, então a fonte não é o Resumo de Planejamento. Esse resumo tem a cubagem planejada com decimais e o nome completo, e não tem ajudantes. A fonte dos ajudantes e da cubagem dos DLs continua sem amostra.
6. **PARTICULARIDADES:**
   - O arquivo lista as cargas com ajudantes acima do possível, uma aba por unidade.
   - A coluna OBSERVAÇÃO está vazia em todos os meses de 2026, e nenhuma fórmula do acompanhamento lê esse arquivo. Isso responde a P-4 da §8: as particularidades são só informativas.
   - Em setembro, parte das cargas listadas aparece depois com o possível digitado, abonada. Em outubro, as abonadas já não estão na lista.
   - O `11 - PARTICULARIDADES - Acumulado mês.xlsx` da pasta é idêntico ao de outubro: novembro ainda não foi feito.
7. **Menores:**
   - O "TOTAL" do quadro por dia faz a média só até a linha 35 (`O5 = AVERAGE(O8:O35)`) e deixa de fora os dias 29 e 30.
   - O "dia anterior" é digitado.
   - O de-para de motoristas está duplicado com o KM.
   - A aba de supervisor da PARTICULARIDADES leva o nome da pessoa (fica fora do Hub).

## 11. Perguntas para o usuário (25/11/2026)
1. **Abonos:** os possíveis digitados são exceções aprovadas (quem aprova e por qual motivo)? Ou o indicador oficial deve seguir só a regra da cubagem?
   - Se forem exceções, no Hub cada carga teria um "abonar" com motivo, em vez de um número digitado.
   - E o abono vale 2 ou 2,1?
2. **Meta:** confirmar 450 para os DAs e 400 para os DLs, com tolerância de +5%.
3. **Fonte dos DAs:** os ajudantes e a cubagem podem vir da montagem Norte/Sul, que o Hub já importa para o KM. Falta definir três coisas:
   - Quais recargas e cargas cross entram, e em que dia: todas as da aba do dia anterior?
   - Juntar duas linhas do mesmo veículo no mesmo dia numa carga só, como o Sul faz?
   - O que fazer quando a montagem vem sem ajudantes (Sul de 16/11)?
4. **Fonte dos DLs:** de onde vêm os ajudantes e a cubagem de Barreiras e Juazeiro, e é possível receber esse arquivo?
5. **Cargas sem ajudantes lançados** (dia em andamento): ficam fora da meta e do realizado?
6. **Particularidades:** o Hub gera a lista sozinho (ajudantes > possível) com um campo de observação por carga? Ela continua só informativa?
7. **Meses fechados:** recalcular pela regra ou manter como foram fechados?
