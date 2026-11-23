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
