---
title: "Montadores — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "[[MOD_Montadores]]"
---
# Montadores (Easy Pallet)

## 1. Objetivo e público
Medir a produtividade dos montadores de carga (caixas/hora, caixas/dia, erros) por base. Faz o ranking e calcula a gratificação. Alimenta o KPI.

## 2. Arquivo atual e histórico
- Atual: `Montadores\Acompanhamento de Montadores - Novembro'26.xlsx` (338 KB).
- Fechados: `2026\MM.Acompanhamento de Montadores - Fechamento de <Mês>'26.xlsx`.
- Anual: `MELHORES ANO AJUDANTES DE GALPÃO.xlsx`, ranking mensal com abas `DA`/`DL` ocultas e cópias "ORIGINAL".
- Outros: `Fatura Easy\[COSTA BRASIL] 202508 - FATURA EASY PALLET.xlsx`, `2025\modelo\Modelo.xlsx` e `Teste de remuneração.xlsx`.

| Aba | Estado | Conteúdo |
|---|---|---|
| `CB NORTE`, `CB SUL`, `LOG I - BARREIRAS`, `LOG II - JUAZEIRO` | visível | matriz montador × dia, ranking, total de caixas, dias trabalhados, erros, gratificação |
| `RESUMO` | oculta | meta 350, média do grupo, dia anterior e ACM por base (lido pelo KPI) |
| `MELHORES DO MÊS` | oculta | top por base |
| `DA` / `DL` | oculta | de-para (SISTEMA → NOME COMPLETO → BASE) em A:C + colagem diária do Easy Pallet em E:J (montador, login, caixas, caixa/hora, erros, data) |

## 3. Relatórios-fonte
| # | Relatório | Sistema | Filtros e período | Frequência | Aba | Amostra |
|---|---|---|---|---|---|---|
| 1 | `AAAA-MM-DD-listas-trabalhadas.xlsx` (um por base) | **Easy Pallet** (export web) | dia anterior, por base | diária | `DA` (Norte/Sul) e `DL` (Barreiras/Juazeiro), colunas E:I | ✅ 4 arquivos de 19/11. Pelos logins: sem sufixo = CB Norte, `(1)` = CB Sul, `(2)` = Barreiras (`dl_*`), `(3)` = Juazeiro |
| 2 | Fatura Easy Pallet | Easy Pallet | mês | mensal | — (não entra no acompanhamento) | arquivo de ago/25 na pasta |

O export tem as colunas `Posição | Montador | Login | Caixas | Caixas/Hora | Erros | Paletes | Misto | LP Duplo | Container | Gaveta`. A planilha usa `Montador`, `Login`, `Caixas`, `Caixas/Hora` e `Erros`. **O export não tem a data nem a base:** as duas são deduzidas do nome do arquivo e de quem baixou.

## 4. Entradas manuais
- De-para de nomes. O nome no Easy Pallet difere da grafia do cadastro (ex.: "Souza" × "Sousa", maiúsculas, nomes abreviados).
- A data de entrega é digitada na colagem.
- Meta 350 e gratificação R$ 0,003 por caixa.

## 5. Regras de cálculo
- Caixa/hora do mês = média de `Caixas/Hora` nos dias com produção > 0.
- Gratificação = caixas × 0,003.
- Ranking por caixa/hora.

## 6. Indicadores de saída e destino
Caixa/hora e caixas/dia por base → KPI (K6:N16). Ranking e gratificação → RH/gestão.

## 7. Riscos e inconsistências
- Os 4 exports têm o mesmo nome base. A base só é identificada pelo sufixo `(n)`, que depende da ordem do download. **É preciso padronizar o nome**, por exemplo `AAAA-MM-DD-listas-trabalhadas - CB NORTE.xlsx`.
- Os logins de Juazeiro misturam três padrões: matrícula numérica, primeiro nome e prefixo `dl_`. Isso dificulta o de-para.
- A data não vem no arquivo: se um dia for colado com atraso, cai na data errada.

## 8. Perguntas em aberto
1. O Easy Pallet permite escolher a base/data no nome do arquivo, ou exportar as 4 bases juntas com a coluna base?
2. A gratificação de 0,003 vale para as 4 bases?

## 9. Situação no Hub
- **Implementado só no navegador** (`docs/js/montadores.js`, rota `#/montadores`, admin).
- Os dados ficam no IndexedDB de quem importou, sem sincronizar com o Firebase. Só quem importou vê.
- Ver `revisao_hub.md`.
