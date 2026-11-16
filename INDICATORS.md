---
title: "HubLogistico — Catálogo de indicadores"
aliases: ["KPIs logística", "Dicionário de indicadores"]
type: project-doc
domain: projects
project: "HubLogistico"
status: review
created: 2026-11-16
updated: 2026-11-16
summary: "Definição, fórmula, meta e origem de cada indicador encontrado nas planilhas (KPI, PES, Montagem, KM, Montadores, Perdas, Retorno, Fill rate), extraídos das fórmulas dos arquivos de out-nov/2026."
tags: []
---
# Catálogo de indicadores

> Fonte: fórmulas e valores dos arquivos mais recentes do zip `Informações Logisticas.zip` (out–nov/2026), lidos em 2026-11-16. Metas mudam por ano/mês; confira a planilha do mês antes de fixar no código. Status `review` até validar os números com um fechamento real.

Convenções: **U** = por unidade (CB Norte, CB Sul, DL Barreiras, DL Juazeiro). ACM = acumulado do mês. Tendência = `ACM ÷ dias trabalhados × dias úteis`.

## 1. KPI Distribuição e Logística (painel consolidado)
Aba `LOGÍSTICA E DISTRIBUIÇÃO`, 4 blocos. Metas de out/2026.

### Distribuição
| Indicador | Fórmula | Meta (Norte / Sul / Barreiras / Juazeiro) | Origem |
|---|---|---|---|
| Volume KO acumulado (cx unit) | soma do mês | — | DAs: digitado; DLs: aba oculta `Montagem das cargas` (← [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Montagem_de_Cargas\|Montagem]]) |
| Cargas acumuladas | contagem | — | idem |
| Pedidos acumulados | contagem | — | idem (DLs: entregas planejadas) |
| Volume médio por carga | volume ACM ÷ cargas ACM | — | calculado |
| Média de pedidos por carga | pedidos ACM ÷ cargas ACM | — | calculado |
| Cubagem média por carga | volume médio por carga ÷ 1,66 (DAs); cubos por carga da Montagem (DLs) | 650 / 600 / 650 / 450 | calculado |
| Índice de retorno por volume | retorno cx unit ÷ volume | 0,75% | DAs: digitado (← [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Retorno_por_Motivo\|Retorno]]); DLs: Montagem |
| Índice de retorno por pedidos | clientes com retorno ÷ pedidos | 1,5% | idem |
| Projeto 1x1 — ajudantes por carga | média ajudantes/carga | meta e real vêm de `Transportes - 1x1/RESUMO` | arquivo **fora do zip** |
| Cashdrive e Greenmile | % de uso válido | 95% DAs / 92% DLs | digitado |

### Remessa e estoque
| Indicador | Fórmula | Meta | Origem |
|---|---|---|---|
| Easy Pallet caixas/montador/hora | média de cx/h dos montadores | 350 | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Montadores\|Montadores]] `RESUMO!I` |
| Easy Pallet caixas/montador/dia | total caixas ÷ dias trabalhados | 2.500 DAs / 1.500 DLs | Montadores |
| Perdas de estoque R$ | DAs: OCO 24 + OCO 28 do Kardex; DLs: total da planilha de perdas | valor mensal por unidade | Kardex TXT (DAs); [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Perdas_de_Estoque\|Perdas DLs]] |
| Perdas de estoque % | DAs: perdas R$ ÷ OCO 1 (venda total R$); DLs: perdas cx unit ÷ volume | 0,11% / 0,10% / 1,0% / 0,85% | idem |
| Fill rate (insuficiência) | falta ÷ (entregue + falta) | ≤ 2% | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Fill_Rate_Insuficiencia\|Fill rate]] (só DAs) |

### Frota / distribuição
| Indicador | Fórmula | Meta | Origem |
|---|---|---|---|
| TRIXLOG | nota de telemetria | 98 | digitado (portal TRIXLOG) |
| Quilometragem | km ACM; tendência; % vs meta = tendência ÷ meta − 1 | 190.000 / 150.000 / 90.000 / 30.000 km | [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_KM_Planejado_x_Realizado\|KM]] `Analise por dia!AH` |
| Média de consumo km/litro | km ÷ litros | 4,55 / 4,30 / 4,50 / 3,80 | listagem de abastecimentos |
| KM planejado × realizado | dif = planejado − realizado; % = realizado ÷ planejado − 1 | — | KM |
| Frota OT LOG I, LOG II e frota puxada Norte | TRIXLOG, km e média km/l | TRIXLOG 98; km 7.650 / 83.250 / 2.100; média 1,8 / 1,95 / 1,8 | digitado |
| Bases | dias úteis, trabalhados, restantes por DA, DL e frota OT | — | digitado |

## 2. PES Logístico 2026 (DLs, Solar)
Planilha `PES - Resultados logisticos - <mês>.xlsm`, abas `CBAR` e `CCRT`. Pontuação possível 1.000; ponto cheio se bater a meta (sem proporcional).

| Indicador | Meta | Pontos | Regra | Origem do real |
|---|---|---|---|---|
| % retorno volume | ≤ 1% | 100 | real ≤ meta | Montagem `R8` (macro `Atualiza_Bases`) |
| % retorno cliente | ≤ 2% | 100 | real ≤ meta | Montagem `S8` |
| % reprogramação volume | ≤ 3% | 100 | real ≤ meta | Reprogramação `F6` |
| % reprogramação cliente | ≤ 3% | 100 | real ≤ meta | Reprogramação `P6` |
| % Green Mile | ≥ 95% | 50 | real ≥ meta | digitado |
| CSAT entregas | ≥ 90 | 50 | real ≥ meta | pesquisa NPS ([[12_PROJECTS/Active/HubLogistico/MODULES/MOD_PES_PETS\|PES]]) |
| Licenças e alvarás | 1 (vigentes) | 200 | real ≥ meta | digitado |
| Acidentes com afastamento | 0 | 200 | real = 0 | digitado |
| Telemetria segurança | ≥ 95% | 100 | real ≥ meta | digitado |

Definições da Solar (deck "Fechamento PED Logístico ago/2025"):
- **% Reprogramação volume** = vol. UC não planejado em até 24 h por falta de capacidade ÷ vol. UC total pré-vendido.
- **% Green Mile** = uso válido do app: início de rota, check-in, check-out e finalização.
- **Certificação** (escala 0–100 no ano): Ouro 90–100, Prata 80–89, Bronze 70–79; exige as 4 licenças vigentes (AVCB, alvará de funcionamento, alvará sanitário, licença operacional ambiental).
- **Desempate**: menos acidentes com afastamento → menor % retorno volume → menor % represamento.
- Ranking mensal da rede de DLs em `Certificação PES 2026 - DL's.xlsx` (ciclos: abr; mai–ago; set–dez).

## 3. PES Comercial 2026 (DAs)
Planilha `PES - Resultados comerciais - <mês>.xlsx`, uma aba por DA. Pontuação possível 850; pontos por faixa de atingimento (aba oculta `Range`).

| Grupo | Indicador | Meta (out/26) | Pontos |
|---|---|---|---|
| Pessoas | Universo Solar | 65% | — |
| Estoque | Fill rate | 98% | 100 |
| Estoque | Dias de estoque NARTD (mín. 10) | 10 | 100 (bateu-levou) |
| Execução | Big Bets | 95% | 120 |
| Execução | RED — nota | 68% | 90 |
| Execução | Parceria/adesão | 75% | 60 |
| Execução | Parceria/qualificação | 66% | 30 |
| Execução | Visitação | 95% | 80 |
| Execução | Share BET NARTD | 69,2% Norte / 73% Sul | 40 |
| Volumes | Volume meta comercial SSD (UC) e demais categorias | meta mensal | 50 cada |

## 4. Montagem de cargas (DLs, diário)
Abas `BARREIRAS` e `JUAZEIRO`, uma linha por dia (macro `Fechamento` gera o calendário).

| Indicador | Fórmula |
|---|---|
| Vol plan cx fís | Σ venda `Cxs Fisicas` − Σ retorno `Cxs Fisica)` do dia |
| Cx unit plan | Σ venda `Cxs Unitaria` − Σ retorno `Cxs Unitarias)` |
| Entregas plan, cargas, vol reprog cx unit, qtd cli reprog | digitados a partir da pré-venda / reprogramação |
| Cubos | cx unit plan ÷ 1,6 |
| Tx ocupação | média da `Taxa Ocupação` |
| Tx de reprog % | vol reprog ÷ cx unit plan |
| Cubos por veículo, cx unit por carga, entregas por carga | ÷ cargas |
| Drop cubos, drop cx unit | ÷ entregas |
| Retorno volume | Σ retorno cx unit com `Retorno = "EXTERNO"` ÷ Σ venda cx unit |
| Retorno cliente | nº de transportes/clientes com retorno externo ÷ entregas |

Resumo (`RESUMO`): volume do ano anterior (AA), meta, dia anterior, ACM, tendência vs meta; **faturamento** = cx unit × tarifa do DL (nov/26: 2,97 Barreiras; 2,85 Juazeiro). Metas anuais em `Metas Volume e Faturamento DLs e OT 2026.xlsx` (meta 2026 = 2025 × 1,03).

## 5. Reprogramação DLs (diário)
| Indicador | Fórmula | Meta |
|---|---|---|
| % reprogramação volume | (cubos das paradas `REPROG` × 1,6) ÷ UC total do Resumo (`N8`) | 3% |
| % reprogramação cliente | nº de paradas `REPROG` ÷ entregas planejadas (`G8`) | 3% |

Só a categoria `REPROG` da aba `Paradas` entra; `REPROG_AGEND` e `REPROG_PERNOITE` ficam de fora. Já o "Vol reprog" da Montagem (`L8` do Resumo) soma as três categorias.

## 6. KM planejado × realizado (todas as unidades, diário)
| Indicador | Fórmula | Meta |
|---|---|---|
| KM planejado | Σ km das rotas planejadas (+ ida e volta da base do motorista) | — |
| KM realizado | Σ `Km's Percorridos` da listagem de abastecimentos | — |
| % dispersão | realizado ÷ planejado − 1 | 5% (`meta = realizado × 5%`) |
| Custo dispersão | (realizado − planejado) × CPK | — |
| Status da rota | DAs: "VERIFICAR PLANEJADO" se dif ≥ 45 km; DLs: "SOLICITAR REVISÃO" se dif > 0 | — |

CPK 2026: DA Norte 2,259 · DA Sul 1,968 · DL BA 2,282 · DL JN 3,448 (R$/km).

## 7. Montadores (Easy Pallet, diário)
| Indicador | Fórmula | Meta |
|---|---|---|
| Caixa/hora por montador | média dos dias com produção > 0 | 350 |
| Produtividade do mês, total de caixas, dias trabalhados, média/dia, total de erros | por montador | — |
| Gratificação | total de caixas × R$ 0,003 | — |
| Ranking e "melhores do mês" | ordem por cx/h | — |

## 8. Perdas de estoque DLs (mensal)
| Indicador | Fórmula |
|---|---|
| Perdas por categoria e motivo (rota, estoque, transporte, inventário) | Σ `Montante em MI` por categoria × motivo; motivo vem do tipo de movimento SAP |
| Perdas em cx unit | qtd × (fat. conv2 ÷ qtd/un) |
| % perdas | perdas cx unit ÷ volume do DL |
| Custo por cx unit | R$ ÷ cx unit perdidas |

## 9. Fill rate / insuficiência (DAs, mensal)
| Indicador | Fórmula | Meta |
|---|---|---|
| % insuficiência | falta de estoque ÷ (pedido entregue + falta) | ≤ 2% |
| Fill rate por linha | 1 − falta ÷ (entregue + falta) | — |
| Ranking de produtos e dias com falta | Σ falta por produto e por dia | — |

## 10. Retorno por motivo (mensal)
- % retorno por motivo = retorno do motivo (cx unit) ÷ volume cx unit da unidade.
- DAs excluem do total motivos administrativos: Norte "CANCELAMENTO DE NF" e "RETORNO DE CONSIGNAÇÃO"; Sul "CANCELAMENTO DE NF" e "ERRO NA EMISSAO DA NOTA FISCAL". **A regra difere entre as unidades**: decidir se padroniza.
- Retorno por motorista em R$ (DAs).

## 11. Cargas em aberto (DAs, diário)
- Dias em aberto = hoje − data de emissão, para pedidos sem data de acerto.
- Carga em aberto mais antiga por revenda (Norte e Sul).

## 12. Outros
- **Custos de descarga (DLs)**: R$ e quantidade de recibos por cliente/fornecedor no mês.
- **NPS entregas**: (promotores − detratores) ÷ respostas × 100. Escala usada na planilha: notas 4–5 promotor, 1–3 detrator. O deck da Solar descreve escala 0–10 (9–10 promotor, 7–8 neutro). Confirmar qual vale em 2026.
- **Gestão à vista (DLs, mensal)**: faturamento, volume (mês/dia/carga), cubos, ocupação, retorno, ajudantes/carga, Green Mile, produtividade Easy Pallet, cargas, pedidos, perdas, custo de distribuição (R$, % faturamento, por cx unit), km, consumo, TRIXLOG, manutenção (total, corretiva, pneus, por km) e empilhadeiras (horas, consumo, custo).
