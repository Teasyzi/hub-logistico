---
title: "HubLogistico — Plano de implementação"
aliases: ["Roadmap Hub Logístico"]
type: project-doc
domain: projects
project: "HubLogistico"
status: in-progress
created: 2026-11-16
updated: 2026-11-16
summary: "Roadmap em fases pequenas: base do pipeline, um acompanhamento por vez (ordenado por valor e simplicidade da fonte) e o KPI consolidado por último."
tags: []
---
# HubLogistico — Plano de implementação

Princípio: **um acompanhamento por vez**, cada um validado em paralelo com o Excel por pelo menos um fechamento antes de aposentar a planilha.

## Ordem proposta
| Fase | Acompanhamento | Por quê nesta ordem | Fonte necessária |
|---|---|---|---|
| 0 | Base do pipeline | pasta de entrada, SQLite, log de importação, cadastro de unidades, gerador de HTML | — |
| 1 | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Montagem_de_Cargas\|Montagem de Cargas]] + Reprogramação | uma exportação alimenta Montagem, Retorno DLs, PES Logístico, Gestão à vista e KPI | F01, F02 |
| 2 | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_PES_PETS\|PES Logístico]] | sai quase de graça da fase 1; elimina a macro com nome fixo | fase 1 + digitados |
| 3 | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Cargas_em_Aberto\|Cargas em aberto]] | uma fonte, regra simples, uso diário | F05, F04 |
| 4 | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Montadores\|Montadores]] | uma fonte; ranking e gratificação | F10 |
| 5 | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Perdas_de_Estoque\|Perdas]] (Kardex DAs + SAP DLs) | Kardex TXT já tem amostras; tira o somatório manual do KPI | F03, F12, F13 |
| 6 | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_KM_Planejado_x_Realizado\|KM planejado × realizado]] | duas fontes + de-para de motorista | F07, F08, F09 |
| 7 | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Retorno_por_Motivo\|Retorno por motivo]] (DAs) e [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Fill_Rate_Insuficiencia\|Fill rate]] | DLs já cobertos na fase 1 | F06, F14 |
| 8 | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_KPI_Distribuicao_Logistica\|KPI]] consolidado + [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Gestao_a_Vista\|Gestão à vista]] | junta tudo; metas em tabela; lançamentos manuais (TRIXLOG, Green Mile…) | fases 1–7, F16–F18 |
| 9 | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Custos_de_Descarga\|Custos de descarga]], PETS (vencimentos) | formulários simples | manual |

A ordem é ajustável: se alguma fonte for mais fácil de conseguir, o acompanhamento dela sobe.

## Critério de pronto de cada fase
- Importador reconhece o arquivo, valida cabeçalho e não duplica em reimportação.
- Indicadores batem com a planilha atual no mesmo período (tolerância a definir, ex.: 0,1%).
- Dashboard HTML do acompanhamento gerado por um comando.
- Nota do módulo atualizada (seção "Proposta" → "Implementado").

## Marcos
| Marco | Data alvo | Status |
|---|---|---|
| Levantamento e documentação dos acompanhamentos | 2026-11-16 | concluído |
| Decisão de stack e local de execução | — | pendente |
| Fase 0 + Fase 1 com dados reais | — | aguardando amostras F01/F02 |

## Riscos
| Risco | Impacto | Mitigação |
|---|---|---|
| Layout das exportações muda (já ocorreu: "Relatório Novo" em perdas, "web" em montadores) | importador quebra | validar cabeçalho e falhar com mensagem clara; testes com amostras de cada versão |
| Política de TI bloqueia Python ou scripts | sem execução local | Python portátil na pasta do usuário; alternativa Power Query/Excel |
| Divergência de regra entre unidades (ex.: exclusões no retorno) | números diferentes do Excel | registrar a regra de cada unidade no catálogo e decidir padronização |
| Dados sensíveis em dashboards compartilhados | exposição | HTML só na rede interna; sem nomes no resumo executivo |
