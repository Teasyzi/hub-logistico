---
title: "PES — PED Logístico (DLs) — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "[[MOD_PES_PETS]]"
---
# PES — PED Logístico (só a parte logística; PED Comercial e PETS fora)

## 1. Objetivo e público
Scorecard mensal dos DLs (CBAR e CCRT) no programa da Solar: 9 indicadores com meta, pontos possíveis × realizados (total 1.000) e comparação com o resultado oficial da Solar.

## 2. Arquivo atual e histórico
- Atual: `PES - Resultados comerciais e logisticos\PED - Logistica\11 - PES - Resultados logisticos - Novembro.xlsm` (29 KB, **VBA** `Atualiza_Bases`, que lê a pasta `Montagem de Cargas`).
- Fechados 2026: `PED - Logistica\2026\MM - PES - Resultados logisticos - <Mês>.xlsm` (abr–out).
- Outros na pasta:
  - `Certificação PES 2026 - DL's.xlsx`: ranking por ciclo, aba `Oficial`;
  - `NPS - mês.xlsx`: abas CCRT/BAR com código, razão social, NPS entregas, justificativa;
  - histórico 2024/2025 com PDFs/PPTX oficiais da Solar.
- Abas: `CBAR` e `CCRT` (A1:N20).

## 3. Relatórios-fonte
| # | Indicador | Meta | Origem | Amostra |
|---|---|---|---|---|
| 1 | % retorno volume | ≤ 1% | Montagem de Cargas (ZSD0090/VOLUMES DE RETORNOS ÷ venda) | ✅ via Montagem |
| 2 | % retorno cliente | ≤ 2% | Montagem (definição Solar a confirmar) | ✅ via Montagem |
| 3 | % reprogramação volume | ≤ 3% | Reprogramação DL's (Resumo de Planejamento) | ✅ |
| 4 | % reprogramação cliente | ≤ 3% | Reprogramação DL's | ✅ |
| 5 | % Green Mile | ≥ 95% | portal Green Mile | ✍️ digitado |
| 6 | CSAT entregas | ≥ 90 | pesquisa NPS/CSAT (`NPS - mês.xlsx`) | ✍️ digitado (escala 1–5 × 0–10 a confirmar) |
| 7 | Licenças e alvarás | sim/não | controle interno | ✍️ |
| 8 | Acidentes com afastamento | 0 | segurança | ✍️ |
| 9 | Telemetria segurança | ≥ 95% | TRIXLOG | ✍️ |
| — | Técnico de segurança; gatilhos (zero fatalidades, licenças) | — | segurança | ✍️ |

Não há relatório de sistema exclusivo do PES. Tudo vem da Montagem ou é digitado.

## 4–5. Entradas manuais e regras
Ver tabela. Pontuação por indicador em `pes.js` / `DESIGN/2026-11-16 PES Logistico design.md`.

## 6. Indicadores de saída e destino
Scorecard → reunião dos DLs e conferência contra o resultado oficial da Solar (colunas K:N "SOLAR / REALIZADOS / DIF").

## 7. Riscos e inconsistências
- A macro `Atualiza_Bases` depende de nomes fixos dos arquivos da Montagem.
- A escala do CSAT/NPS e a definição de "% retorno cliente" ainda não estão confirmadas com a Solar.

## 8. Perguntas em aberto
1. Escala CSAT 2026: 1–5 ou 0–10?
2. Definição oficial de "% retorno cliente".
3. A `Certificação PES 2026` deve entrar no Hub (ranking por ciclo) ou fica fora?

## 9. Situação no Hub
- **Implementado** (`#/pes`, `pes.js`, `exportar_pes.js`). A Digitação de nov/26 ainda está pendente no `TASKS.md`.
- Os indicadores automáticos dependem da Montagem, que já tem o layout confirmado.
